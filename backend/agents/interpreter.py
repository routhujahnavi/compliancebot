import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def run_interpreter(document: dict):
    print(f"📖 Agent 2: Interpreter reading: {document['title'][:60]}")

    text = document.get("summary", "") or document.get("title", "")

    prompt = f"""
You are a legal compliance expert. Analyze this regulatory document and extract structured information.

Document Title: {document['title']}
Document Text: {text}
Jurisdiction: {document['jurisdiction']}
Topic: {document['topic']}

Extract and return ONLY a JSON object with this exact structure, no other text:
{{
    "obligations": [
        {{"text": "what must be done", "confidence": 0.9}}
    ],
    "prohibitions": [
        {{"text": "what is banned", "confidence": 0.9}}
    ],
    "deadlines": [
        {{"text": "deadline description", "confidence": 0.9}}
    ],
    "scope": "who is affected",
    "jurisdiction": "which regions",
    "summary": "2 sentence plain English summary",
    "requires_human_review": false
}}

If confidence for any item is below 0.7, set requires_human_review to true.
Return ONLY the JSON, no markdown, no explanation.
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a legal compliance expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ]
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        extracted = json.loads(raw)

        extracted["source_document"] = document
        extracted["title"] = document["title"]
        extracted["url"] = document["url"]

        needs_review = extracted.get("requires_human_review", False)
        if needs_review:
            print(f"⚠️  Low confidence — flagged for human review")
        else:
            print(f"✅ Interpreter done: {len(extracted.get('obligations', []))} obligations found")

        return extracted

    except Exception as e:
        print(f"❌ Interpreter error: {e}")
        return None