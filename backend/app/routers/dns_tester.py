import random
import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HostedZone, DnsRecord
from ..schemas import DnsTestRequest, DnsTestResponse

router = APIRouter(prefix="/api/test-dns", tags=["DNS Query Tester"])


@router.post("", response_model=DnsTestResponse)
def test_dns_resolution(payload: DnsTestRequest, db: Session = Depends(get_db)):
    start_time = time.time()
    query_name = payload.record_name.strip().lower()
    if not query_name.endswith("."):
        query_name += "."
    qtype = payload.record_type.upper().strip()

    # Find matching zone
    matching_records = db.query(DnsRecord).filter(
        DnsRecord.name.ilike(query_name),
        DnsRecord.type == qtype
    ).all()

    # Route 53 Nameserver simulation
    nameservers = [
        "ns-124.awsdns-15.com",
        "ns-1632.awsdns-12.co.uk",
        "ns-892.awsdns-47.net",
        "ns-239.awsdns-29.org"
    ]
    selected_ns = random.choice(nameservers)

    # If no exact match, check CNAME or check ANY
    cname_record = None
    if not matching_records and qtype != "CNAME":
        cname_record = db.query(DnsRecord).filter(
            DnsRecord.name.ilike(query_name),
            DnsRecord.type == "CNAME"
        ).first()

    elapsed_ms = round((time.time() - start_time) * 1000 + random.uniform(12.4, 28.6), 2)
    now_utc = datetime.now(timezone.utc)

    if cname_record:
        # Resolve CNAME target
        cname_target = cname_record.values[0] if cname_record.values else (cname_record.alias_target or "")
        answers = [f"{query_name} IN CNAME {cname_target}"]
        
        # Follow CNAME if internal
        target_recs = db.query(DnsRecord).filter(
            DnsRecord.name.ilike(cname_target if cname_target.endswith(".") else f"{cname_target}."),
            DnsRecord.type == qtype
        ).all()
        if target_recs:
            for tr in target_recs:
                for val in tr.values:
                    answers.append(f"{cname_target} IN {qtype} {val}")
        elif not target_recs and qtype == "A":
            answers.append(f"{cname_target} IN A 192.0.2.142")

        raw_output = f"""; <<>> DiG 9.10.6-P1 <<>> {query_name} {qtype} @{selected_ns}
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: {random.randint(10000, 65535)}
;; flags: qr rd ra; QUERY: 1, ANSWER: {len(answers)}, AUTHORITY: 4, ADDITIONAL: 1

;; ANSWER SECTION:
""" + "\n".join(f"{a}" for a in answers)

        return DnsTestResponse(
            record_name=query_name,
            record_type=qtype,
            status="NOERROR",
            response_code=0,
            answers=answers,
            ttl=cname_record.ttl,
            nameserver=selected_ns,
            query_time_ms=elapsed_ms,
            timestamp=now_utc,
            raw_response=raw_output,
        )

    if matching_records:
        # Handle routing policy selection (e.g. weighted)
        chosen_record = random.choice(matching_records)
        
        if chosen_record.is_alias:
            answers = [f"{query_name} IN {qtype} (ALIAS -> {chosen_record.alias_target})"]
            if qtype == "A":
                answers.append(f"{chosen_record.alias_target} IN A 52.84.12.14")
                answers.append(f"{chosen_record.alias_target} IN A 52.84.12.89")
        else:
            answers = [f"{query_name} {chosen_record.ttl} IN {qtype} {val}" for val in chosen_record.values]

        raw_output = f"""; <<>> DiG 9.10.6-P1 <<>> {query_name} {qtype} @{selected_ns}
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: {random.randint(10000, 65535)}
;; flags: qr aa rd; QUERY: 1, ANSWER: {len(answers)}, AUTHORITY: 4, ADDITIONAL: 0

;; QUESTION SECTION:
;{query_name:<30} IN      {qtype}

;; ANSWER SECTION:
""" + "\n".join(answers) + f"""

;; Query time: {elapsed_ms} msec
;; SERVER: {selected_ns}#53({selected_ns})
;; WHEN: {now_utc.strftime('%a %b %d %H:%M:%S UTC %Y')}
;; MSG SIZE  rcvd: {len(raw_output) if 'raw_output' in locals() else 142}
"""

        return DnsTestResponse(
            record_name=query_name,
            record_type=qtype,
            status="NOERROR",
            response_code=0,
            answers=answers,
            ttl=chosen_record.ttl,
            nameserver=selected_ns,
            query_time_ms=elapsed_ms,
            timestamp=now_utc,
            raw_response=raw_output,
        )

    # Record not found -> NXDOMAIN
    raw_output = f"""; <<>> DiG 9.10.6-P1 <<>> {query_name} {qtype} @{selected_ns}
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: {random.randint(10000, 65535)}
;; flags: qr aa rd; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 0

;; QUESTION SECTION:
;{query_name:<30} IN      {qtype}

;; AUTHORITY SECTION:
{query_name} 900 IN SOA {selected_ns} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400

;; Query time: {elapsed_ms} msec
;; SERVER: {selected_ns}#53({selected_ns})
"""

    return DnsTestResponse(
        record_name=query_name,
        record_type=qtype,
        status="NXDOMAIN",
        response_code=3,
        answers=[],
        ttl=900,
        nameserver=selected_ns,
        query_time_ms=elapsed_ms,
        timestamp=now_utc,
        raw_response=raw_output,
    )

