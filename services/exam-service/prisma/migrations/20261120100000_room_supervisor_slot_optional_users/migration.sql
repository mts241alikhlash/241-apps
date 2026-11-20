ALTER TABLE exam_room_supervisors ALTER COLUMN scheduled_user_id DROP NOT NULL;
ALTER TABLE exam_room_supervisors ALTER COLUMN actual_user_id DROP NOT NULL;
