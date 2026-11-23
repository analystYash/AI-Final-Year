# -*- coding: utf-8 -*-
"""
Interactive & Command-Line SQL Interface for DrugAI Project Databases
Supports querying drug_ai.db and users.db directly from PowerShell or Terminal.

Usage:
  # 1. Interactive SQL shell:
  python backend/sql_cli.py
  python backend/sql_cli.py --db users

  # 2. Direct single query:
  python backend/sql_cli.py "SELECT id, name, age, gender FROM patients LIMIT 5"
  python backend/sql_cli.py --db users "SELECT id, name, email, specialization FROM doctors"

  # 3. List tables and schema:
  python backend/sql_cli.py --tables
  python backend/sql_cli.py --schema patients
"""

import sys
import os
import sqlite3
import argparse

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASES = {
    "drug_ai": os.path.join(BACKEND_DIR, "drug_ai.db"),
    "users": os.path.join(BACKEND_DIR, "users.db"),
}

def get_connection(db_key="drug_ai"):
    db_path = DATABASES.get(db_key, db_key)
    if not os.path.isabs(db_path):
        db_path = os.path.join(BACKEND_DIR, db_path)
    if not os.path.exists(db_path):
        # Check if user passed full file name
        alt_path = os.path.join(BACKEND_DIR, f"{db_key}.db")
        if os.path.exists(alt_path):
            db_path = alt_path
        else:
            raise FileNotFoundError(f"Database file not found: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn, db_path

def format_table(columns, rows):
    """Formats SQL rows into a clean, aligned ASCII table."""
    if not rows:
        return "(0 rows returned)"

    col_widths = [len(str(col)) for col in columns]
    for row in rows:
        for idx, val in enumerate(row):
            val_str = str(val if val is not None else "NULL")
            if len(val_str) > col_widths[idx]:
                col_widths[idx] = min(len(val_str), 45)  # Cap width for readability

    # Header
    sep = "+-" + "-+-".join("-" * w for w in col_widths) + "-+"
    header = "| " + " | ".join(str(col).ljust(w)[:w] for col, w in zip(columns, col_widths)) + " |"
    lines = [sep, header, sep]

    for row in rows:
        formatted_row = []
        for idx, val in enumerate(row):
            val_str = str(val if val is not None else "NULL")
            if len(val_str) > col_widths[idx]:
                val_str = val_str[:col_widths[idx] - 3] + "..."
            formatted_row.append(val_str.ljust(col_widths[idx]))
        lines.append("| " + " | ".join(formatted_row) + " |")

    lines.append(sep)
    lines.append(f"Total: {len(rows)} row(s)")
    return "\n".join(lines)

def list_tables(db_key="drug_ai"):
    conn, db_path = get_connection(db_key)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [r[0] for r in cur.fetchall()]
    conn.close()
    
    print(f"\nTables in [{os.path.basename(db_path)}]:")
    print("-" * 40)
    for t in tables:
        # Get count
        c_conn, _ = get_connection(db_key)
        try:
            cnt = c_conn.cursor().execute(f"SELECT COUNT(*) FROM \"{t}\";").fetchone()[0]
            print(f"  * {t:<28} ({cnt:,} records)")
        except Exception:
            print(f"  * {t}")
        finally:
            c_conn.close()
    print("-" * 40)

def show_schema(table_name, db_key="drug_ai"):
    conn, db_path = get_connection(db_key)
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info(\"{table_name}\");")
    cols = cur.fetchall()
    conn.close()

    if not cols:
        print(f"Table '{table_name}' not found in [{os.path.basename(db_path)}].")
        return

    print(f"\nSchema for Table '{table_name}' in [{os.path.basename(db_path)}]:")
    print("-" * 65)
    print(f" {'CID':<4} | {'Column Name':<25} | {'Type':<15} | {'Nullable':<8} | {'PK'}")
    print("-" * 65)
    for col in cols:
        cid, name, c_type, notnull, dflt, pk = col[0], col[1], col[2], col[3], col[4], col[5]
        nullable = "NO" if notnull else "YES"
        is_pk = "YES" if pk else "-"
        print(f" {cid:<4} | {name:<25} | {c_type:<15} | {nullable:<8} | {is_pk}")
    print("-" * 65)

def execute_query(query, db_key="drug_ai"):
    conn, db_path = get_connection(db_key)
    cur = conn.cursor()
    try:
        cur.execute(query)
        if query.strip().upper().startswith(("SELECT", "PRAGMA", "EXPLAIN")):
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description] if cur.description else []
            print(f"\nDatabase: {os.path.basename(db_path)}")
            print(format_table(columns, rows))
        else:
            conn.commit()
            print(f"\nDatabase: {os.path.basename(db_path)}")
            print(f"Query executed successfully. Rows affected: {cur.rowcount}")
    except Exception as e:
        print(f"\n[SQL ERROR] {e}")
    finally:
        conn.close()

def interactive_shell(db_key="drug_ai"):
    current_db = db_key
    print("=" * 68)
    print(" DrugAI Interactive SQL Shell for PowerShell & Terminal")
    print(f" Active Database: {current_db}.db (Available: drug_ai, users)")
    print(" Commands:")
    print("   .tables          - List all tables in current database")
    print("   .schema <table>  - View table structure")
    print("   .use <drug_ai|users> - Switch active database")
    print("   .exit or quit    - Exit the shell")
    print("=" * 68)

    while True:
        try:
            prompt = f"SQL ({current_db})> "
            query = input(prompt).strip()
            if not query:
                continue
            if query.lower() in ("exit", "quit", ".exit", ".quit", "\\q"):
                print("Exiting SQL shell.")
                break
            elif query.lower() == ".tables":
                list_tables(current_db)
            elif query.lower().startswith(".schema"):
                parts = query.split(maxsplit=1)
                if len(parts) > 1:
                    show_schema(parts[1].strip().strip(";"), current_db)
                else:
                    print("Usage: .schema <table_name>")
            elif query.lower().startswith(".use"):
                parts = query.split(maxsplit=1)
                if len(parts) > 1:
                    new_db = parts[1].strip().replace(".db", "")
                    if new_db in DATABASES:
                        current_db = new_db
                        print(f"Switched database to: {current_db}.db")
                    else:
                        print(f"Unknown database '{new_db}'. Valid options: {list(DATABASES.keys())}")
                else:
                    print("Usage: .use <drug_ai|users>")
            else:
                execute_query(query, current_db)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting SQL shell.")
            break

def main():
    parser = argparse.ArgumentParser(description="DrugAI SQLite PowerShell Query CLI")
    parser.add_argument("query", nargs="?", help="SQL query to execute directly")
    parser.add_argument("--db", default="drug_ai", choices=["drug_ai", "users"], help="Target database: drug_ai or users (default: drug_ai)")
    parser.add_argument("--tables", action="store_true", help="List all tables and record counts in the database")
    parser.add_argument("--schema", help="Show table column structure and data types")

    args = parser.parse_args()

    if args.tables:
        list_tables(args.db)
    elif args.schema:
        show_schema(args.schema, args.db)
    elif args.query:
        execute_query(args.query, args.db)
    else:
        interactive_shell(args.db)

if __name__ == "__main__":
    main()
