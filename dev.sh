#!/bin/bash
# 개발 환경 실행 스크립트
# 운영(Docker)과 포트 충돌 방지: 백엔드 8001, 프론트 5173
# 운영 포트: 백엔드 8000, 프론트 80(nginx)/30010

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=${DEV_BACKEND_PORT:-8001}
export PJ_DATA_DIR="${PJ_DATA_DIR:-/data}"

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

cd "$ROOT_DIR/backend"
.venv/bin/uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Dev servers started:"
echo "    Frontend → http://localhost:5173"
echo "    Backend  → http://localhost:${BACKEND_PORT}"
echo "    Ctrl+C to stop"
echo ""

wait
