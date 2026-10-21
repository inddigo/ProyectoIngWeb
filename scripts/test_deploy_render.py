import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("deploy_render", Path(__file__).with_name("deploy-render.py"))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeploymentSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        values = {
            "RENDER_API_KEY": "unit-test-key", "APP_REVISION": "a" * 40,
            "EVIDENCE_DIR": self.temp.name,
            "STAGING_URL": "https://test-web.onrender.com",
            "API_URL": "https://test-api.onrender.com", "NLP_URL": "https://test-nlp.onrender.com",
        }
        for label in ("NLP", "API", "WEB"):
            values[f"RENDER_{label}_SERVICE_ID"] = "srv-" + label.lower()
        context = patch.dict(os.environ, values, clear=True)
        context.start()
        self.addCleanup(context.stop)

    def test_refuses_files_and_foreign_hosts_before_opening_a_connection(self):
        with patch.object(deploy.http.client, "HTTPSConnection") as connection:
            for url in ("file:///etc/passwd", "https://attacker.invalid/", "https://api.render.com.attacker.invalid/"):
                with self.assertRaises(RuntimeError):
                    deploy.request_json(url)
            with self.assertRaises(RuntimeError):
                deploy.request_json("https://test.onrender.com/", token="unit-test-key")
            connection.assert_not_called()

    def test_refuses_paid_service_before_triggering_deploy(self):
        with patch.object(deploy, "request_json", return_value={"serviceDetails": {"plan": "starter"}}) as request:
            with self.assertRaisesRegex(RuntimeError, "Free"):
                deploy.main()
            self.assertEqual(request.call_count, 1)

    def test_refuses_live_deployment_of_wrong_commit(self):
        with patch.object(deploy, "request_json", side_effect=[
            {"serviceDetails": {"plan": "free"}}, {"id": "dep-test"},
            {"status": "live", "commit": {"id": "b" * 40}},
        ]):
            with self.assertRaisesRegex(RuntimeError, "commit"):
                deploy.main()
        self.assertEqual(list(Path(self.temp.name).iterdir()), [])

    def test_records_only_verified_revisions_and_checks_all_services(self):
        def response(url, token=None, payload=None):
            if payload is not None:
                self.assertEqual(payload, {"commitId": "a" * 40})
                return {"id": "dep-test"}
            if "/deploys/" in url:
                return {"status": "live", "commit": {"id": "a" * 40}}
            if url.endswith("/health"):
                return {"status": "ok"}
            return {"serviceDetails": {"plan": "free"}}
        with patch.object(deploy, "request_json", side_effect=response) as request:
            deploy.main()
            self.assertEqual(request.call_count, 12)
        self.assertEqual(len(list(Path(self.temp.name).glob("render-*.json"))), 3)


if __name__ == "__main__":
    unittest.main()
