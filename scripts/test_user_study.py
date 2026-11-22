import importlib.util
import io
import unittest
from pathlib import Path
from unittest.mock import MagicMock

spec = importlib.util.spec_from_file_location("user_study", Path(__file__).with_name("analyze-user-study.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StudyTests(unittest.TestCase):
    def analyze(self, rows):
        path = MagicMock()
        path.open.return_value = io.StringIO(
            "participant,condition,task,seconds,corrections,success,utility,understanding\n" + rows
        )
        return module.analyze(path)

    def test_empty_is_pending_not_success(self):
        result = self.analyze("")
        self.assertEqual(result["status"], "pending_real_observations")
        self.assertIsNone(result["pairedMeanTimeReductionPercent"])

    def test_pairs_anonymous_observations(self):
        result = self.analyze("P01,baseline,carpinteria,100,3,1,3,3\nP01,adaptive,diseno,80,1,1,4,4\n")
        self.assertEqual(result["pairedParticipants"], 1)
        self.assertEqual(result["pairedMeanTimeReductionPercent"], 20)

    def test_rejects_personal_identifiers_and_duplicates(self):
        for rows in ["nombre@example.test,adaptive,diseno,80,1,1,4,4\n", "P01,adaptive,diseno,80,1,1,4,4\n" * 2]:
            with self.assertRaises(ValueError):
                self.analyze(rows)


if __name__ == "__main__":
    unittest.main()
