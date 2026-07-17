from __future__ import annotations

from pathlib import Path

from config import get_settings


class MemoryStore:
    """Episodic memory. Uses a simple file list by default so demos stay offline-fast.

    Set CHROMA_ENABLED=true to use persistent Chroma (may download embedding models).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.path = Path(settings.chroma_path)
        self.path.mkdir(parents=True, exist_ok=True)
        self._fallback: dict[str, list[str]] = {}
        self._collection = None
        if getattr(settings, "chroma_enabled", False):
            try:
                import chromadb

                client = chromadb.PersistentClient(path=str(self.path))
                self._collection = client.get_or_create_collection("coachos_memory")
            except Exception:
                self._collection = None

    def add(self, user_id: str, text: str) -> None:
        if self._collection is not None:
            try:
                import uuid

                self._collection.add(
                    documents=[text],
                    ids=[f"{user_id}-{uuid.uuid4().hex[:8]}"],
                    metadatas=[{"user_id": user_id}],
                )
                return
            except Exception:
                pass
        self._fallback.setdefault(user_id, []).append(text)
        # Cap memory
        self._fallback[user_id] = self._fallback[user_id][-50:]

    def recall(self, user_id: str, query: str, n: int = 3) -> list[str]:
        if self._collection is not None:
            try:
                result = self._collection.query(
                    query_texts=[query],
                    n_results=n,
                    where={"user_id": user_id},
                )
                docs = (result.get("documents") or [[]])[0]
                return list(docs)
            except Exception:
                pass
        items = self._fallback.get(user_id, [])
        if not items:
            return []
        # Naive keyword overlap recall
        q = set(query.lower().split())
        scored = sorted(
            items,
            key=lambda t: len(q.intersection(t.lower().split())),
            reverse=True,
        )
        return scored[:n]


memory_store = MemoryStore()
