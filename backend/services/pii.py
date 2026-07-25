"""
PII Masking utility using Microsoft Presidio.
Scrubs sensitive data before any text reaches the LLM.
Uses en_core_web_sm for smaller deploy size (Vercel/serverless friendly).
"""
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

_nlp_engine = NlpEngineProvider(
    nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }
).create_engine()
_analyzer = AnalyzerEngine(nlp_engine=_nlp_engine)
_anonymizer = AnonymizerEngine()

# Map entity type → placeholder token that survives round-trips
_OPERATORS: dict[str, OperatorConfig] = {
    "PERSON":       OperatorConfig("replace", {"new_value": "<PERSON>"}),
    "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "<EMAIL>"}),
    "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "<PHONE>"}),
    "CREDIT_CARD":  OperatorConfig("replace", {"new_value": "<CREDIT_CARD>"}),
    "US_SSN":       OperatorConfig("replace", {"new_value": "<SSN>"}),
    "IP_ADDRESS":   OperatorConfig("replace", {"new_value": "<IP>"}),
    "URL":          OperatorConfig("replace", {"new_value": "<URL>"}),
    "LOCATION":     OperatorConfig("replace", {"new_value": "<LOCATION>"}),
    "DATE_TIME":    OperatorConfig("replace", {"new_value": "<DATE>"}),
}


def mask_pii(text: str, language: str = "en") -> tuple[str, list[dict]]:
    """
    Returns (masked_text, findings).
    findings is a list of {entity_type, start, end, score} for audit logging.
    """
    results = _analyzer.analyze(text=text, language=language)
    if not results:
        return text, []

    anonymized = _anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators=_OPERATORS,
    )
    findings = [
        {"entity_type": r.entity_type, "start": r.start, "end": r.end, "score": r.score}
        for r in results
    ]
    return anonymized.text, findings
