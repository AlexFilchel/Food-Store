import asyncio
import sys

import uvicorn


def main() -> None:
    # Windows + psycopg async: requires SelectorEventLoopPolicy.
    # This MUST run before uvicorn creates the event loop.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
