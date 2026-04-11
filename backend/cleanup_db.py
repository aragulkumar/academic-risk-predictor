import sqlite3
conn = sqlite3.connect('academic_risk.db')
c = conn.cursor()

# Delete orphaned students (those without a matching user), roll numbers ML2024*
c.execute("DELETE FROM students WHERE roll_number LIKE 'ML2024%'")
deleted = conn.total_changes
conn.commit()
print(f"Cleaned {deleted} orphaned student records.")
conn.close()
