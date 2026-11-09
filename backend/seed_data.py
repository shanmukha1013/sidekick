import pymongo
import uuid
from datetime import datetime, timezone

def seed():
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017")
    db = client["sidekick"]

    sample_jobs = [
        {
            "id": str(uuid.uuid4()),
            "title": "Frontend React Developer",
            "description": "Develop modern web interfaces using Next.js, Tailwind CSS, and TypeScript for college campus portal.",
            "responsibilities": "Build responsive UI components, integrate REST APIs, and maintain performance.",
            "benefits": "Flexible working hours, mentorship from senior engineers, completion certificate.",
            "hourly_rate": 450.0,
            "job_type": "Part-time",
            "experience_level": "Entry",
            "skills_required": "React, Next.js, Tailwind CSS, TypeScript",
            "working_hours": "15-20 hrs/week",
            "location_name": "Hyderabad, Telangana",
            "is_remote": False,
            "lat": 17.3850,
            "lng": 78.4867,
            "status": "open",
            "employer_id": "system-demo-employer",
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "UI/UX & Graphic Design Intern",
            "description": "Design mobile app screens, marketing graphics, and landing page wireframes in Figma.",
            "responsibilities": "Create design systems, collaborate with frontend devs, gather user feedback.",
            "benefits": "Creative freedom, portfolio-worthy live projects, flexible schedule.",
            "hourly_rate": 350.0,
            "job_type": "Internship",
            "experience_level": "Entry",
            "skills_required": "Figma, UI/UX, Graphic Design, Prototyping",
            "working_hours": "10-15 hrs/week",
            "location_name": "Bangalore, Karnataka",
            "is_remote": False,
            "lat": 12.9716,
            "lng": 77.5946,
            "status": "open",
            "employer_id": "system-demo-employer",
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Python & Data Automation Freelancer",
            "description": "Write Python scripts for web scraping, data cleaning, and automated reporting.",
            "responsibilities": "Build resilient scrapers, structure CSV/JSON pipelines, and automate alerts.",
            "benefits": "Milestone-based bonuses, recurring weekly tasks.",
            "hourly_rate": 550.0,
            "job_type": "Freelance",
            "experience_level": "Mid",
            "skills_required": "Python, BeautifulSoup, Pandas, Automation",
            "working_hours": "12-18 hrs/week",
            "location_name": "Mumbai, Maharashtra",
            "is_remote": False,
            "lat": 19.0760,
            "lng": 72.8777,
            "status": "open",
            "employer_id": "system-demo-employer",
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Campus Event Ambassador",
            "description": "Coordinate student tech events, organize registrations, and manage logistics on weekends.",
            "responsibilities": "Engage attendees, assist speaker setups, coordinate check-in tables.",
            "benefits": "Free merchandise, networking with industry leaders, weekend-only commitment.",
            "hourly_rate": 300.0,
            "job_type": "Weekend",
            "experience_level": "Entry",
            "skills_required": "Communication, Event Management, Leadership",
            "working_hours": "8 hrs/weekend",
            "location_name": "New Delhi, Delhi",
            "is_remote": False,
            "lat": 28.6139,
            "lng": 77.2090,
            "status": "open",
            "employer_id": "system-demo-employer",
            "created_at": datetime.now(timezone.utc),
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Content Writer & Tech Blogger",
            "description": "Write engaging blog posts, social media summaries, and student guides on emerging tech.",
            "responsibilities": "Research topics, write 1000-word articles, optimize for SEO.",
            "benefits": "Byline credit, fully remote, work anytime.",
            "hourly_rate": 400.0,
            "job_type": "Student",
            "experience_level": "Entry",
            "skills_required": "Content Writing, SEO, Research, English",
            "working_hours": "10 hrs/week",
            "location_name": "Pune, Maharashtra",
            "is_remote": False,
            "lat": 18.5204,
            "lng": 73.8567,
            "status": "open",
            "employer_id": "system-demo-employer",
            "created_at": datetime.now(timezone.utc),
        },
    ]

    for j in sample_jobs:
        j["_id"] = j["id"]
        db.jobs.update_one({"title": j["title"]}, {"$set": j}, upsert=True)

    print(f"Database seeded successfully! Total jobs in database: {db.jobs.count_documents({})}")

if __name__ == "__main__":
    seed()
