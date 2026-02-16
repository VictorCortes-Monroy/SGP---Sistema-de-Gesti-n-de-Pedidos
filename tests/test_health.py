class TestHealthEndpoints:
    async def test_root(self, client):
        resp = await client.get("/")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Welcome to SGP API"

    async def test_health(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
