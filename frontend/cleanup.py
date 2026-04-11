with open('src/pages/MentorDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="card mb-5 border-purple-', 'className="card border-purple-')

with open('src/pages/MentorDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
