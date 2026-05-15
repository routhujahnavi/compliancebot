import os
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()

SOP_PATH = os.path.join(os.path.dirname(__file__), "../SOPs/aml_policy.txt")

def load_sop_into_chroma():
    print("📚 Loading SOPs into vector database...")
    client = chromadb.Client()

    try:
        client.delete_collection("sop_collection")
    except:
        pass

    ef = embedding_functions.DefaultEmbeddingFunction()
    collection = client.create_collection(
        name="sop_collection",
        embedding_function=ef
    )

    with open(SOP_PATH, "r") as f:
        content = f.read()

    chunks = [chunk.strip() for chunk in content.split("\n\n") if chunk.strip()]

    for i, chunk in enumerate(chunks):
        collection.add(
            documents=[chunk],
            ids=[f"sop_{i}"]
        )

    print(f"✅ Loaded {len(chunks)} SOP sections into vector DB")
    return collection

async def run_comparator(interpreted: dict):
    print("🔍 Agent 3: Comparator finding gaps...")

    collection = load_sop_into_chroma()
    obligations = interpreted.get("obligations", [])
    gap_report = []

    for obligation in obligations:
        text = obligation.get("text", "")
        confidence = obligation.get("confidence", 1.0)

        results = collection.query(
            query_texts=[text],
            n_results=2
        )

        matching_sections = results["documents"][0] if results["documents"] else []
        distances = results["distances"][0] if results["distances"] else []

        if not matching_sections or distances[0] > 1.2:
            status = "NO_COVERAGE"
            matched = "No existing policy covers this"
        elif distances[0] > 0.8:
            status = "PARTIAL_COVERAGE"
            matched = matching_sections[0][:100]
        else:
            status = "COVERED"
            matched = matching_sections[0][:100]

        gap_report.append({
            "obligation": text,
            "confidence": confidence,
            "status": status,
            "matched_section": matched,
            "action_needed": status != "COVERED"
        })

        print(f"  {'✅' if status == 'COVERED' else '⚠️ ' if status == 'PARTIAL_COVERAGE' else '❌'} {status}: {text[:60]}")

    gaps_found = sum(1 for g in gap_report if g["action_needed"])
    print(f"📊 Comparator done: {gaps_found} gaps found out of {len(obligations)} obligations")

    return {
        "gap_report": gap_report,
        "title": interpreted.get("title", ""),
        "url": interpreted.get("url", ""),
        "summary": interpreted.get("summary", ""),
        "jurisdiction": interpreted.get("jurisdiction", ""),
        "deadlines": interpreted.get("deadlines", []),
        "requires_human_review": interpreted.get("requires_human_review", False)
    }