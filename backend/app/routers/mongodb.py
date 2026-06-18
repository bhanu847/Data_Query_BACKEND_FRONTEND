import json
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.query_engine import run_query
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import QueryLog, Source, User
from app.schemas.schemas import (
    MongoDBConnectRequest,
    MongoDBQueryRequest,
    QueryResponse,
    SourceOut,
)
from app.services import store

router = APIRouter(prefix="/sources/mongodb", tags=["mongodb"])


def _get_mongo_client(conn: dict):
    try:
        from pymongo import MongoClient
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="pymongo is not installed. Run: pip install pymongo",
        )

    if conn.get("username") and conn.get("password"):
        uri = (
            f"mongodb://{conn['username']}:{conn['password']}"
            f"@{conn['host']}:{conn['port']}"
            f"/{conn['database']}?authSource={conn.get('auth_source', 'admin')}"
        )
    else:
        uri = f"mongodb://{conn['host']}:{conn['port']}/{conn['database']}"

    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client


@router.post("/connect")
def connect_mongodb(
    payload: MongoDBConnectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    conn_info = {
        "host": payload.host,
        "port": payload.port,
        "database": payload.database,
        "username": payload.username,
        "password": payload.password,
        "auth_source": payload.auth_source,
    }

    try:
        client = _get_mongo_client(conn_info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot connect to MongoDB: {e}")

    mongo_db = client[payload.database]
    collections = mongo_db.list_collection_names()

    if not collections:
        client.close()
        raise HTTPException(status_code=400, detail="Database has no collections")

    target_collection = payload.collection or collections[0]
    if target_collection not in collections:
        client.close()
        raise HTTPException(
            status_code=400,
            detail=f"Collection '{target_collection}' not found. Available: {collections}",
        )

    coll = mongo_db[target_collection]
    docs = list(coll.find({}, {"_id": 0}).limit(1000))
    doc_count = coll.estimated_document_count()
    client.close()

    if not docs:
        raise HTTPException(status_code=400, detail=f"Collection '{target_collection}' is empty")

    df = pd.json_normalize(docs)

    conn_info_safe = {**conn_info, "password": "***"}
    conn_info_safe["collection"] = target_collection

    source = Source(
        owner_id=user.id,
        name=f"{payload.database}.{target_collection}",
        kind="mongodb",
        file_path=None,
        row_count=doc_count,
        columns=json.dumps(list(df.columns)),
        connection_info=json.dumps(conn_info),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    store.set_frame(source.id, df)

    return {
        "source_id": source.id,
        "source": SourceOut(
            id=source.id,
            name=source.name,
            kind=source.kind,
            row_count=source.row_count,
            columns=list(df.columns),
            created_at=source.created_at,
        ),
        "collections": collections,
        "active_collection": target_collection,
        "document_count": doc_count,
        "preview": df.head(20).to_dict(orient="records"),
        "columns": list(df.columns),
    }


@router.get("/collections/{source_id}")
def list_collections(
    source_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = (
        db.query(Source)
        .filter(Source.id == source_id, Source.owner_id == user.id, Source.kind == "mongodb")
        .first()
    )
    if not source or not source.connection_info:
        raise HTTPException(status_code=404, detail="MongoDB source not found")

    conn = json.loads(source.connection_info)
    try:
        client = _get_mongo_client(conn)
        collections = client[conn["database"]].list_collection_names()
        client.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot connect: {e}")

    return {"collections": collections}


@router.post("/switch-collection/{source_id}")
def switch_collection(
    source_id: int,
    collection: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = (
        db.query(Source)
        .filter(Source.id == source_id, Source.owner_id == user.id, Source.kind == "mongodb")
        .first()
    )
    if not source or not source.connection_info:
        raise HTTPException(status_code=404, detail="MongoDB source not found")

    conn = json.loads(source.connection_info)
    try:
        client = _get_mongo_client(conn)
        mongo_db = client[conn["database"]]
        coll = mongo_db[collection]
        docs = list(coll.find({}, {"_id": 0}).limit(1000))
        doc_count = coll.estimated_document_count()
        client.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot query collection: {e}")

    if not docs:
        raise HTTPException(status_code=400, detail=f"Collection '{collection}' is empty")

    df = pd.json_normalize(docs)

    conn["collection"] = collection
    source.name = f"{conn['database']}.{collection}"
    source.row_count = doc_count
    source.columns = json.dumps(list(df.columns))
    source.connection_info = json.dumps(conn)
    db.commit()
    store.set_frame(source.id, df)

    return {
        "source_id": source.id,
        "collection": collection,
        "document_count": doc_count,
        "columns": list(df.columns),
        "preview": df.head(20).to_dict(orient="records"),
    }


@router.post("/ask", response_model=QueryResponse)
def ask_mongodb(
    payload: MongoDBQueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = (
        db.query(Source)
        .filter(Source.id == payload.source_id, Source.owner_id == user.id)
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if source.kind == "mongodb" and source.connection_info:
        conn = json.loads(source.connection_info)
        collection = payload.collection or conn.get("collection")
        if collection:
            try:
                client = _get_mongo_client(conn)
                coll = client[conn["database"]][collection]
                docs = list(coll.find({}, {"_id": 0}).limit(1000))
                client.close()
                if docs:
                    df = pd.json_normalize(docs)
                    store.set_frame(source.id, df)
            except Exception:
                pass

    try:
        df = store.get_frame(db, payload.source_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source data not found. Try reconnecting.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = run_query(df, payload.question)

    db.add(QueryLog(
        user_id=user.id, source_id=payload.source_id,
        question=payload.question, answer=result.get("answer"),
    ))
    db.commit()
    return result


@router.post("/refresh/{source_id}")
def refresh_data(
    source_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = (
        db.query(Source)
        .filter(Source.id == source_id, Source.owner_id == user.id, Source.kind == "mongodb")
        .first()
    )
    if not source or not source.connection_info:
        raise HTTPException(status_code=404, detail="MongoDB source not found")

    conn = json.loads(source.connection_info)
    collection = conn.get("collection")
    if not collection:
        raise HTTPException(status_code=400, detail="No collection specified")

    try:
        client = _get_mongo_client(conn)
        coll = client[conn["database"]][collection]
        docs = list(coll.find({}, {"_id": 0}).limit(1000))
        doc_count = coll.estimated_document_count()
        client.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot refresh: {e}")

    if not docs:
        raise HTTPException(status_code=400, detail="Collection is empty")

    df = pd.json_normalize(docs)
    source.row_count = doc_count
    source.columns = json.dumps(list(df.columns))
    db.commit()
    store.set_frame(source.id, df)

    return {
        "source_id": source.id,
        "document_count": doc_count,
        "columns": list(df.columns),
        "message": f"Refreshed {doc_count} documents from {collection}",
    }
