# CareConnect

Helping patients and families find and compare hospice care services with clarity and confidence.

## Why CareConnect?

Finding hospice care is not just a logistical decision—it’s an emotional and deeply personal one.
However, existing platforms often overwhelm users with scattered data and little guidance.

CareConnect simplifies this process by:

- Centralizing hospice information
- Making quality metrics understandable
- Helping users find care that aligns with their needs and values

## Features

- Smart Search  
  Search hospice organizations by location, name, or proximity.

- Personalized Matching  
  A questionnaire-based system that recommends organizations based on user needs.

- Side-by-side Comparison  
  Compare up to 3 organizations across key metrics like care services, conditions treated, and quality scores.

- Interactive Map  
  Visualize nearby hospice providers with real-time distance calculations.

## Tech Stack

Frontend:

- Next.js (React)
- Tailwind CSS

Backend:

- Next.js API Routes

Database:

- Supabase (PostgreSQL)

APIs:

- Google Maps API (location + distance calculation)

## How It Works

1. Users enter a location or search for hospice providers
2. The system retrieves nearby organizations from the database
3. A matching algorithm scores organizations based on user preferences and care metrics
4. Results are ranked and displayed with key information
5. Users can compare organizations side-by-side to make informed decisions
