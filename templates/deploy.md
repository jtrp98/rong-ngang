# <ชื่อ module> — Deploy

> ไฟล์เดียว append (Deploy History ต่อท้าย; เกินใหญ่ย้าย era เก่า verbatim ไป `deploy\archive.md` พร้อมแถวชี้) · เขียนโดย `devops` · deploy/migration จริงต้องให้คนยืนยันใน session ก่อนทุกครั้ง

## Environments

| Env | URL / host | Deploy ด้วย | Owner |
|---|---|---|---|

## Required Environment Keys

| Key (ชื่อเท่านั้น ห้ามใส่ค่า) | ใช้ทำอะไร | Env |
|---|---|---|

## Runbook

1. <ขั้นตอน deploy>

## Rollback

1. <ขั้นตอนถอยกลับ>

## Deploy History

### YYYY-MM-DD — Release R1 → <env>

- **ยืนยันโดย:** <ชื่อ> · **Scope:** <task ids>
- **Unverified Behaviour ที่แจ้งผู้ใช้แล้ว:** <รายการ / none>
- **Migration:** none | dry-run output, ตาราง/คอลัมน์ที่โดน, destructive?
- **Backup:** <ที่เก็บ> · **Restore test:** <target ชั่วคราว + output + การตรวจข้อมูล> หรือ "not verified, because …" (ผู้ใช้รับทราบ)
- **Health check หลัง deploy:** <ผลจริง>

Back-links: `plan\index.md` · `..\index.md`
