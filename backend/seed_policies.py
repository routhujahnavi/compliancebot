import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, SessionLocal, CompanyPolicy

def seed():
    init_db()
    db = SessionLocal()

    policies = [
        {
            "title": "Data Privacy Policy",
            "section": "Section 3.1",
            "content": "Customer data is stored securely. Access is restricted to authorized personnel. Data is retained for 5 years.",
            "version": "2.1",
            "jurisdiction": "US",
            "topic": "data privacy"
        },
        {
            "title": "Breach Notification Policy",
            "section": "Section 4.2",
            "content": "In the event of a data breach, affected customers will be notified within 30 days.",
            "version": "1.3",
            "jurisdiction": "US",
            "topic": "data breach"
        },
        {
            "title": "Third Party Vendor Policy",
            "section": "Section 6.1",
            "content": "All third party vendors undergo annual security review. Contracts include data protection clauses.",
            "version": "1.0",
            "jurisdiction": "US",
            "topic": "vendor management"
        },
        {
            "title": "Encryption Standards",
            "section": "Section 5.2",
            "content": "Sensitive data is encrypted at rest using AES-128. Passwords are hashed using bcrypt.",
            "version": "1.1",
            "jurisdiction": "US",
            "topic": "encryption"
        },
        {
            "title": "GDPR Compliance Policy",
            "section": "Section 7.1",
            "content": "EU customer data is handled per GDPR. Data subject requests are fulfilled within 30 days. Data transfers outside EU use standard contractual clauses.",
            "version": "1.0",
            "jurisdiction": "EU",
            "topic": "data privacy"
        }
    ]

    for p in policies:
        existing = db.query(CompanyPolicy).filter_by(title=p["title"], section=p["section"]).first()
        if not existing:
            db.add(CompanyPolicy(**p))

    db.commit()
    db.close()
    print(f"✅ Seeded {len(policies)} company policies into database")

if __name__ == "__main__":
    seed()