from __future__ import annotations

from typing import Iterable, List


def _normalize_path(path: str) -> str:
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return path if path.startswith("/") else f"/{path}"


def join_url(base_url: str, path: str) -> str:
    normalized = _normalize_path(path)
    if normalized.startswith("http://") or normalized.startswith("https://"):
        return normalized
    return f"{base_url.rstrip('/')}{normalized}"


def looks_like_gateway(base_url: str) -> bool:
    lowered = (base_url or "").lower().rstrip("/")
    return (
        "api-gateway" in lowered
        or lowered.endswith(":8080")
        or lowered.endswith(":3000")
    )


def build_callback_urls(
    *,
    base_url: str,
    configured_endpoint: str,
    gateway_path: str,
    direct_path: str,
) -> List[str]:
    configured = _normalize_path(configured_endpoint)
    gateway = _normalize_path(gateway_path)
    direct = _normalize_path(direct_path)

    if configured.startswith("http://") or configured.startswith("https://"):
        ordered_paths: Iterable[str] = [configured, gateway, direct]
    elif looks_like_gateway(base_url):
        ordered_paths = [gateway, configured, direct]
    else:
        ordered_paths = [direct, configured, gateway]

    urls: List[str] = []
    seen = set()
    for path in ordered_paths:
        if not path:
            continue
        url = join_url(base_url, path)
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls
