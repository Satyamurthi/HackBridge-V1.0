#!/usr/bin/env python3
import sqlite3
import uuid
import re
from datetime import datetime, timezone, timedelta

def parse_pdf_layout(filepath, prefix):
    with open(filepath) as f:
        text = f.read()
    pages = text.split('\x0c')
    problems = []
    for page_idx, page in enumerate(pages[1:], 2):
        if f'PROBLEM STATEMENT {prefix}-' not in page:
            continue
        lines = page.split('\n')
        code = None
        title_lines = []
        in_title = False
        
        idx_overview = -1
        idx_desc = -1
        idx_mission = -1
        idx_twocol = -1
        idx_eval = -1
        idx_footer = -1
        
        for i, l in enumerate(lines):
            ls = l.strip()
            if f'PROBLEM STATEMENT {prefix}-' in l:
                code_match = re.search(rf'({prefix}-\d+)', l)
                if code_match:
                    code = code_match.group(1)
                in_title = True
                continue
            if in_title:
                if ls == 'PROBLEM STATEMENT OVERVIEW':
                    in_title = False
                    idx_overview = i
                elif ls:
                    title_lines.append(ls)
                continue
            if ls == 'DESCRIPTION':
                idx_desc = i
            elif ls == 'MISSION':
                idx_mission = i
            elif 'RESOURCES' in l and 'SUCCESS METRICS' in l:
                idx_twocol = i
            elif ls.startswith('EVALUATION BOUNDARY'):
                idx_eval = i
            elif 'Cynefian Private Limited' in l:
                idx_footer = i
                
        title = ' '.join(title_lines).strip()
        overview = '\n'.join(lines[idx_overview+1:idx_desc]).strip() if idx_overview != -1 and idx_desc != -1 else ''
        description = '\n'.join(lines[idx_desc+1:idx_mission]).strip() if idx_desc != -1 and idx_mission != -1 else ''
        mission = '\n'.join(lines[idx_mission+1:idx_twocol]).strip() if idx_mission != -1 and idx_twocol != -1 else ''
        eval_boundary = '\n'.join(lines[idx_eval+1:idx_footer if idx_footer != -1 else len(lines)]).strip() if idx_eval != -1 else ''
        
        left_col_lines = []
        right_col_lines = []
        if idx_twocol != -1 and idx_eval != -1:
            for l in lines[idx_twocol:idx_eval]:
                left = l[:75].rstrip()
                right = l[75:].strip() if len(l) > 75 else ''
                left_col_lines.append(left)
                right_col_lines.append(right)
                
        left_text = '\n'.join(left_col_lines)
        resources = ''
        goals = ''
        if 'GOALS' in left_text:
            parts = left_text.split('GOALS')
            resources = parts[0].replace('RESOURCES', '').strip()
            goals = parts[1].strip()
        else:
            resources = left_text.replace('RESOURCES', '').strip()
            
        right_text = '\n'.join(right_col_lines)
        metrics = ''
        safety = ''
        if 'SAFETY, SECURITY & COMPLIANCE' in right_text:
            parts = right_text.split('SAFETY, SECURITY & COMPLIANCE')
            metrics = parts[0].replace('SUCCESS METRICS', '').strip()
            safety = parts[1].strip()
        else:
            metrics = right_text.replace('SUCCESS METRICS', '').strip()
            
        full_desc = f'''### 📋 Problem Statement Overview
{overview}

### 🔍 Context & Problem Details
{description}

### 🎯 Mission
{mission}

### 📦 Provided Resources
{resources}

### 📊 Success Metrics
{metrics}

### 🚀 Goals & Deliverables
{goals}

### 🛡️ Safety, Security & Compliance
{safety}

### ⚖️ Evaluation Boundary
{eval_boundary}'''

        problems.append({
            'code': code,
            'title': f'{code}: {title}',
            'raw_title': title,
            'overview': overview,
            'description': full_desc,
            'mission': mission,
            'resources': resources,
            'metrics': metrics,
            'goals': goals,
            'safety': safety,
            'eval_boundary': eval_boundary,
            'difficulty': 'HARD' if code in ['AO-01', 'AO-02', 'CC-01', 'CC-02', 'ER-01', 'ER-02'] else ('MEDIUM' if code in ['AO-03', 'AO-04', 'CC-03', 'CC-04', 'ER-03', 'ER-04'] else 'EASY'),
            'cap': 0
        })
    return problems

def parse_docx_tracks():
    with open('docx_paras.txt') as f:
        text = f.read()
    paras = text.split('\n\n')
    track_indices = []
    for i, p in enumerate(paras):
        if p.startswith('Track '):
            track_indices.append((i, p))
    track_indices.append((len(paras), 'END'))
    section_keys = [
        'DOMAIN:', 'Problem Statement', 'Your Mission', 'Provided Resources',
        'Success Metrics', 'Stretch Goals', 'Safety and Evaluation Boundary',
        'Core Challenge', 'Live-Finale Fallback Policy', 'Accounting Specification', 'Sandbox Rules'
    ]
    cyber = []
    for idx in range(len(track_indices)-1):
        start_i, full_title = track_indices[idx]
        end_i, _ = track_indices[idx+1]
        sections = {}
        curr_key = 'HEADER'
        curr_paras = []
        for i in range(start_i+1, end_i):
            p = paras[i]
            if p.startswith('Part 5:') or p.startswith('Part 6:') or p.startswith('Part 7:'):
                break
            matched_key = None
            for k in section_keys:
                if p.startswith(k) or p == k:
                    matched_key = k
                    break
            if matched_key:
                if curr_paras:
                    sections[curr_key] = '\n\n'.join(curr_paras)
                curr_key = matched_key
                curr_paras = []
                rem = p[len(matched_key):].strip()
                if rem:
                    curr_paras.append(rem)
            else:
                curr_paras.append(p)
        if curr_paras:
            sections[curr_key] = '\n\n'.join(curr_paras)
            
        code = f'TRACK-0{idx+1}'
        ps_overview = sections.get('Problem Statement', '')
        mission = sections.get('Your Mission', '')
        resources = sections.get('Provided Resources', '')
        metrics = sections.get('Success Metrics', '')
        stretch = sections.get('Stretch Goals', '')
        safety = sections.get('Safety and Evaluation Boundary', '')
        fallback = sections.get('Live-Finale Fallback Policy', sections.get('Accounting Specification', ''))
        
        full_desc = f'''### 📋 Problem Statement Overview
{ps_overview}

### 🎯 Mission
{mission}

### 📦 Provided Resources
{resources}

### 📊 Success Metrics
{metrics}

### 🚀 Stretch Goals
{stretch}

### 🛡️ Safety & Evaluation Boundary
{safety}'''
        if fallback:
            full_desc += f'''\n\n### ⚖️ Operational Rules & Fallback Policy\n{fallback}'''
            
        cyber.append({
            'code': code,
            'title': full_title,
            'raw_title': full_title,
            'overview': ps_overview,
            'description': full_desc,
            'mission': mission,
            'resources': resources,
            'metrics': metrics,
            'goals': stretch,
            'safety': safety,
            'eval_boundary': fallback or safety,
            'difficulty': 'HARD' if idx in [0, 2] else 'MEDIUM',
            'cap': 0
        })
    return cyber

def update_database(db_path):
    print(f'=== Updating {db_path} ===')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # 1. Parse document problems
    ai_ops = parse_pdf_layout('ai-ops-layout.txt', 'AO')
    cloud = parse_pdf_layout('cloud-layout.txt', 'CC')
    erp = parse_pdf_layout('erp-layout.txt', 'ER')
    cyber = parse_docx_tracks()
    
    parsed_map = {
        'AI Ops': ai_ops,
        'Cloud Computing': cloud,
        'Enterprise ERP': erp,
        'Cyber Security': cyber
    }
    
    # 2. Find HACKMITTEN 3.0
    c.execute('SELECT id, hostId, title, slug, description, rules, rulesGate, teamMin, teamMax, fee, paymentMode, qrImageUrl, upiId, bannerUrl, prizePool, startAt, endAt FROM hackathons WHERE slug="hackmitten-3-0" OR title LIKE "%HACKMITTEN 3.0%"')
    hack_row = c.fetchone()
    if not hack_row:
        print('HACKMITTEN 3.0 not found!')
        return
        
    hack_id = hack_row[0]
    print(f'Found HACKMITTEN 3.0: id={hack_id}')
    
    # Update HACKMITTEN 3.0 domains with new problem statements
    c.execute('SELECT id, name FROM domains WHERE hackathonId=?', (hack_id,))
    domains = c.fetchall()
    
    for dom_id, dom_name in domains:
        if dom_name in parsed_map:
            print(f'Replacing problem statements for {dom_name} ({dom_id})...')
            c.execute('DELETE FROM problem_statements WHERE domainId=?', (dom_id,))
            for ps in parsed_map[dom_name]:
                ps_id = str(uuid.uuid4())
                c.execute('''
                    INSERT INTO problem_statements (
                        id, domainId, title, description, difficulty, cap,
                        code, overview, mission, resources, metrics, goals, safetyRules, evalBoundary,
                        createdAt, updatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ''', (
                    ps_id, dom_id, ps['title'], ps['description'], ps['difficulty'], ps['cap'],
                    ps['code'], ps['overview'], ps['mission'], ps['resources'], ps['metrics'], ps['goals'], ps['safety'], ps['eval_boundary']
                ))
            print(f'  Inserted {len(parsed_map[dom_name])} statements for {dom_name}')
            
    # 3. Create or Refresh Replica Hackathon: HACKMITTEN 3.0 (Test Replica)
    replica_slug = 'hackmitten-3-test-replica'
    c.execute('SELECT id FROM hackathons WHERE slug=?', (replica_slug,))
    existing_rep = c.fetchone()
    if existing_rep:
        rep_id = existing_rep[0]
        print(f'Cleaning existing replica {rep_id}...')
        # Remove old teams, domains, problem statements for replica
        c.execute('SELECT id FROM domains WHERE hackathonId=?', (rep_id,))
        rep_doms = [r[0] for r in c.fetchall()]
        for rd in rep_doms:
            c.execute('DELETE FROM problem_statements WHERE domainId=?', (rd,))
        c.execute('DELETE FROM domains WHERE hackathonId=?', (rep_id,))
        c.execute('DELETE FROM team_members WHERE teamId IN (SELECT id FROM teams WHERE hackathonId=?)', (rep_id,))
        c.execute('DELETE FROM payments WHERE teamId IN (SELECT id FROM teams WHERE hackathonId=?)', (rep_id,))
        c.execute('DELETE FROM code_repos WHERE teamId IN (SELECT id FROM teams WHERE hackathonId=?)', (rep_id,))
        c.execute('DELETE FROM teams WHERE hackathonId=?', (rep_id,))
        c.execute('DELETE FROM hackathons WHERE id=?', (rep_id,))
        
    rep_id = str(uuid.uuid4())
    # 8:15 AM IST today is 1793155500000
    tz_ist = timezone(timedelta(hours=5, minutes=30))
    dt_reveal = datetime(2026, 10, 28, 8, 15, 0, tzinfo=tz_ist)
    reveal_ms = int(dt_reveal.timestamp() * 1000)
    
    start_ms = int(datetime(2026, 10, 28, 7, 0, 0, tzinfo=tz_ist).timestamp() * 1000)
    end_ms = int(datetime(2026, 10, 29, 9, 0, 0, tzinfo=tz_ist).timestamp() * 1000)
    
    print(f'Creating HACKMITTEN 3.0 (Test Replica) with revealAt = {reveal_ms} (08:15:00 IST)...')
    c.execute('''
        INSERT INTO hackathons (
            id, hostId, title, slug, description, rules, rulesGate,
            teamMin, teamMax, fee, paymentMode, qrImageUrl, upiId, bannerUrl, prizePool,
            status, startAt, endAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ''', (
        rep_id, hack_row[1], 'HACKMITTEN 3.0 (Test Replica)', replica_slug,
        'Test replica of HACKMITTEN 3.0 with problem statement reveal timer set to 8:15 AM IST.',
        hack_row[5], 1, hack_row[7], hack_row[8], 0.0, 'FREE',
        hack_row[11], hack_row[12], hack_row[13], hack_row[14],
        'PUBLISHED', start_ms, end_ms
    ))
    
    # Copy domains to replica with revealAt = 8:15 AM IST
    c.execute('SELECT id, name, description FROM domains WHERE hackathonId=?', (hack_id,))
    orig_domains = c.fetchall()
    
    replica_cyber_dom_id = None
    replica_ai_dom_id = None
    
    for orig_d_id, d_name, d_desc in orig_domains:
        rep_d_id = str(uuid.uuid4())
        if d_name == 'Cyber Security':
            replica_cyber_dom_id = rep_d_id
        elif d_name == 'AI Ops':
            replica_ai_dom_id = rep_d_id
            
        c.execute('''
            INSERT INTO domains (id, hackathonId, name, description, revealAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ''', (rep_d_id, rep_id, d_name, d_desc, reveal_ms))
        
        # Copy problem statements from original domain to replica domain
        c.execute('''
            SELECT title, description, difficulty, cap, code, overview, mission, resources, metrics, goals, safetyRules, evalBoundary
            FROM problem_statements WHERE domainId=?
        ''', (orig_d_id,))
        for ps_row in c.fetchall():
            rep_ps_id = str(uuid.uuid4())
            c.execute('''
                INSERT INTO problem_statements (
                    id, domainId, title, description, difficulty, cap,
                    code, overview, mission, resources, metrics, goals, safetyRules, evalBoundary,
                    createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ''', (
                rep_ps_id, rep_d_id, ps_row[0], ps_row[1], ps_row[2], ps_row[3],
                ps_row[4], ps_row[5], ps_row[6], ps_row[7], ps_row[8], ps_row[9], ps_row[10], ps_row[11]
            ))
            
    print('Copied all domains and problem statements to replica with 8:15 AM reveal.')
    
    # 4. Enroll student Samahith A (samahith2005@gmail.com) into test squad in replica
    c.execute('SELECT s.id, u.id FROM users u JOIN students s ON u.id=s.userId WHERE u.email="samahith2005@gmail.com"')
    student_info = c.fetchone()
    if student_info:
        student_id, user_id = student_info
        team_id = str(uuid.uuid4())
        team_code = 'TEAM-REP001'
        print(f'Registering student {student_id} into replica squad {team_code}...')
        
        c.execute('''
            INSERT INTO teams (
                id, teamId, hackathonId, leadStudentId, domainId, problemStatementId,
                name, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'ACTIVE', datetime('now'), datetime('now'))
        ''', (
            team_id, team_code, rep_id, student_id, replica_cyber_dom_id or replica_ai_dom_id,
            'TEAM F40 (Test Replica)'
        ))
        
        # Team member
        member_id = str(uuid.uuid4())
        c.execute('''
            INSERT INTO team_members (id, teamId, studentId, role, joinedAt)
            VALUES (?, ?, ?, 'LEADER', datetime('now'))
        ''', (member_id, team_id, student_id))
        
        # Payment record
        payment_id = str(uuid.uuid4())
        c.execute('''
            INSERT INTO payments (
                id, teamId, mode, status, amount, verifiedAt, createdAt, updatedAt
            ) VALUES (?, ?, 'FREE', 'VERIFIED', 0.0, datetime('now'), datetime('now'), datetime('now'))
        ''', (payment_id, team_id))
        
        print(f'Test squad {team_code} registered in replica! Team ID: {team_id}')
        
    conn.commit()
    conn.close()
    print(f'Successfully updated {db_path}!\n')

if __name__ == '__main__':
    for db in ['prisma/backend.db', 'backend.db']:
        update_database(db)
