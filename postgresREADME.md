Step 1:
Download and install PostgreSQL
Go to https://www.postgresql.org/download/windows/ and download the installer. Run it — keep all defaults. When it asks for a password, set one you'll remember (e.g. postgres). The default port 5432 is fine. It will also install pgAdmin (a GUI for your database).

Step 2:
Create a database for SmartPlant
Open pgAdmin (installed with PostgreSQL) → expand Servers → PostgreSQL → right-click Databases → Create → Database. Name it smartplant. Click Save.

Step 3:
Set DATABASE_URL in your .env
In your Flask project's .env file, add this line (replace 'postgres' with whatever password you set): DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartplant The format is: postgresql://username:password@host:port/database_name

Step 4:
Run the app
Start Flask normally with python app.py. SQLAlchemy will connect to PostgreSQL instead of SQLite and create the tables automatically on first run. You can verify in pgAdmin by expanding smartplant → Schemas → public → Tables.