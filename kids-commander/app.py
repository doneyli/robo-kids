"""Entry point: python app.py"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=4100,
        reload=True,
        log_level="info"
    )
