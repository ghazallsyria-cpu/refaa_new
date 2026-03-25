-- Seed Data for مدرسة الرفعة النموذجية

-- Subjects
INSERT INTO public.subjects (id, name, code) VALUES ('b6e8257d-3362-4101-b6dd-f488aeaa5347', 'اسلامية', 'SUB_293');
INSERT INTO public.subjects (id, name, code) VALUES ('d919c3b0-c5f6-4a71-b79c-14763d3a9005', 'عربي', 'SUB_207');
INSERT INTO public.subjects (id, name, code) VALUES ('8d466769-0036-4141-adc7-9fc2d98472cd', 'فرنسي', 'SUB_231');
INSERT INTO public.subjects (id, name, code) VALUES ('968faf83-baf1-440f-ad52-d57a41c1ef7d', 'انجليزي', 'SUB_427');
INSERT INTO public.subjects (id, name, code) VALUES ('88cb1df6-0a46-46a8-880f-9eadb167380d', 'رياضيات', 'SUB_782');
INSERT INTO public.subjects (id, name, code) VALUES ('3a0fead3-7d80-456d-9a25-7c057b2c08e1', 'كيمياء', 'SUB_967');
INSERT INTO public.subjects (id, name, code) VALUES ('e59aa4e3-d6ac-42bd-80ea-5268edba8835', 'فيزياء', 'SUB_640');
INSERT INTO public.subjects (id, name, code) VALUES ('c94962dc-7f34-47f8-82ec-c54a8fdcc099', 'علوم', 'SUB_195');
INSERT INTO public.subjects (id, name, code) VALUES ('947a54a3-265c-472d-9b41-2b01ce637ae2', 'احياء', 'SUB_725');
INSERT INTO public.subjects (id, name, code) VALUES ('8d5865f3-85f2-45a5-8b78-9f64efa2bb23', 'جيولوجيا', 'SUB_690');
INSERT INTO public.subjects (id, name, code) VALUES ('c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9', 'اجتماعيات', 'SUB_164');
INSERT INTO public.subjects (id, name, code) VALUES ('64c93f95-738c-43f1-83d3-81e02b8ab340', 'تاريخ', 'SUB_364');
INSERT INTO public.subjects (id, name, code) VALUES ('761d2151-bc35-438a-869b-81d883c27b0b', 'جغرافيا', 'SUB_618');
INSERT INTO public.subjects (id, name, code) VALUES ('09e94fc7-4abe-459b-9f50-7273be59daa8', 'دستور', 'SUB_693');
INSERT INTO public.subjects (id, name, code) VALUES ('5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d', 'فلسفة', 'SUB_892');
INSERT INTO public.subjects (id, name, code) VALUES ('582f8f8b-6836-4577-a683-c389ddf097ba', 'علم نفس', 'SUB_235');
INSERT INTO public.subjects (id, name, code) VALUES ('3cdc5af3-885d-484e-b0a0-6ce158fa4fe4', 'حاسوب', 'SUB_119');

-- Classes
INSERT INTO public.classes (id, name, level) VALUES ('c2a1ec2a-6217-4d13-991e-ad3591c2a486', 'الصف السادس', 6);
INSERT INTO public.classes (id, name, level) VALUES ('98b4f1e4-f5dc-4860-91be-d422db826ff2', 'الصف السابع', 7);
INSERT INTO public.classes (id, name, level) VALUES ('7dbb87ae-7a37-4789-81ca-35083af334f1', 'الصف الثامن', 8);
INSERT INTO public.classes (id, name, level) VALUES ('dc7871a3-f0ae-451f-af53-8b185d467703', 'الصف التاسع', 9);
INSERT INTO public.classes (id, name, level) VALUES ('38769a9e-53e4-41ce-aab6-c9fde368c4fc', 'الصف العاشر', 10);
INSERT INTO public.classes (id, name, level) VALUES ('765daf3d-ed21-48dd-8863-495b162d3315', 'الصف الحادي عشر', 11);
INSERT INTO public.classes (id, name, level) VALUES ('db934501-1436-4eaa-a3ea-325809dd1a99', 'الصف الثاني عشر', 12);

-- Sections
INSERT INTO public.sections (id, class_id, name) VALUES ('1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', 'db934501-1436-4eaa-a3ea-325809dd1a99', '1-12');
INSERT INTO public.sections (id, class_id, name) VALUES ('79980f7c-75c3-4150-970a-2eb642ba10a8', 'db934501-1436-4eaa-a3ea-325809dd1a99', '3-12');
INSERT INTO public.sections (id, class_id, name) VALUES ('c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '765daf3d-ed21-48dd-8863-495b162d3315', '3-11');
INSERT INTO public.sections (id, class_id, name) VALUES ('1fb7518b-4a0b-4b5b-8878-8fcd3512393b', 'db934501-1436-4eaa-a3ea-325809dd1a99', '2-12');
INSERT INTO public.sections (id, class_id, name) VALUES ('7041a15c-8fb4-49e9-83c5-675518f028c9', 'db934501-1436-4eaa-a3ea-325809dd1a99', '1-12د');
INSERT INTO public.sections (id, class_id, name) VALUES ('64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '765daf3d-ed21-48dd-8863-495b162d3315', '2-11');
INSERT INTO public.sections (id, class_id, name) VALUES ('ea20f422-671e-4659-9481-88195214782e', '765daf3d-ed21-48dd-8863-495b162d3315', '5-11');
INSERT INTO public.sections (id, class_id, name) VALUES ('fec1dba8-a220-453d-80aa-f834d684a566', 'db934501-1436-4eaa-a3ea-325809dd1a99', '4-12');
INSERT INTO public.sections (id, class_id, name) VALUES ('f2396f36-0330-4dbf-82b0-6d3324b584b6', 'db934501-1436-4eaa-a3ea-325809dd1a99', '5-12');
INSERT INTO public.sections (id, class_id, name) VALUES ('a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '765daf3d-ed21-48dd-8863-495b162d3315', '11-1');
INSERT INTO public.sections (id, class_id, name) VALUES ('776dfe93-7fb3-4cb1-8a02-a7effa670d88', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '5-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '6-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('d0cd7175-d032-423c-b879-d82756064ef4', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '4-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('37986ff2-56e1-4813-b3f4-0aafd4f430ec', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '3-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('cc4d791b-1145-40e1-9363-29fb01c5fe9f', '765daf3d-ed21-48dd-8863-495b162d3315', '1-11د');
INSERT INTO public.sections (id, class_id, name) VALUES ('59564b28-4921-4014-91be-6f46db650a91', '765daf3d-ed21-48dd-8863-495b162d3315', '4-11');
INSERT INTO public.sections (id, class_id, name) VALUES ('f8311834-5dd8-462e-9310-3d585e32ed70', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م2');
INSERT INTO public.sections (id, class_id, name) VALUES ('26dfb75c-5fff-4de8-acbc-e91afd8dab2f', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م3');
INSERT INTO public.sections (id, class_id, name) VALUES ('c4ef03b9-a66c-455e-8ca1-8db8991c9f31', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م4');
INSERT INTO public.sections (id, class_id, name) VALUES ('24b45e62-545e-408b-98e4-c46b9eaecf2a', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '2-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م1');
INSERT INTO public.sections (id, class_id, name) VALUES ('7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '38769a9e-53e4-41ce-aab6-c9fde368c4fc', '1-10');
INSERT INTO public.sections (id, class_id, name) VALUES ('2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م2');
INSERT INTO public.sections (id, class_id, name) VALUES ('f99c7c21-4118-45fe-8306-ffaf649aee54', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م3');
INSERT INTO public.sections (id, class_id, name) VALUES ('fbf6163e-1257-40d1-b3bb-b124e17d3fa0', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م4');
INSERT INTO public.sections (id, class_id, name) VALUES ('491bf99f-1510-4605-86bc-25036b2b4d77', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م6');
INSERT INTO public.sections (id, class_id, name) VALUES ('1d7b2c1d-7afd-4260-9926-0ed073c48418', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م1');
INSERT INTO public.sections (id, class_id, name) VALUES ('4feadac2-d59f-4e88-9096-bb33ca284713', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م5');
INSERT INTO public.sections (id, class_id, name) VALUES ('7b0e8ed2-9482-437a-b820-7b7384508462', 'dc7871a3-f0ae-451f-af53-8b185d467703', '9م7');
INSERT INTO public.sections (id, class_id, name) VALUES ('887f3e8c-bd79-4b44-b286-8322edcbc32e', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م1');
INSERT INTO public.sections (id, class_id, name) VALUES ('e8f274ca-6c76-4328-90f2-41b0385ecb18', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م2');
INSERT INTO public.sections (id, class_id, name) VALUES ('d40c2147-7e84-44b4-bed2-cf8e03026102', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م3');
INSERT INTO public.sections (id, class_id, name) VALUES ('f3805cbe-13e7-4673-a185-51c5e8306857', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م5');
INSERT INTO public.sections (id, class_id, name) VALUES ('f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م5');
INSERT INTO public.sections (id, class_id, name) VALUES ('59b543cf-4ef2-4fa8-8918-f6549da0d9b5', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م4');
INSERT INTO public.sections (id, class_id, name) VALUES ('260b2a13-6b4e-41fb-9241-0019933f2d71', '7dbb87ae-7a37-4789-81ca-35083af334f1', '8م6');
INSERT INTO public.sections (id, class_id, name) VALUES ('69d3a4be-0ab6-4cf4-a1a9-561d13f59566', 'c2a1ec2a-6217-4d13-991e-ad3591c2a486', '6م2');
INSERT INTO public.sections (id, class_id, name) VALUES ('b1672001-f96a-43ec-a63e-a340316824ef', 'c2a1ec2a-6217-4d13-991e-ad3591c2a486', '6م1');
INSERT INTO public.sections (id, class_id, name) VALUES ('baf53c97-a5cf-40aa-9fe6-47d8b3142160', 'c2a1ec2a-6217-4d13-991e-ad3591c2a486', '6م5');
INSERT INTO public.sections (id, class_id, name) VALUES ('45a93414-9895-4d6c-bdc5-f1eda789902f', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م7');
INSERT INTO public.sections (id, class_id, name) VALUES ('b6efd326-6ce7-4114-b5b6-a401374c47f5', 'c2a1ec2a-6217-4d13-991e-ad3591c2a486', '6م3');
INSERT INTO public.sections (id, class_id, name) VALUES ('cd8904ae-ef82-43c7-aea8-f2b688a6a252', 'c2a1ec2a-6217-4d13-991e-ad3591c2a486', '6م4');
INSERT INTO public.sections (id, class_id, name) VALUES ('2ae284b7-d230-48a7-b237-4fd6263b022c', '98b4f1e4-f5dc-4860-91be-d422db826ff2', '7م6');

-- Teachers
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher1@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', 'teacher1@alrefaa.edu', 'سمير الشمري', 'teacher') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', '231740619564', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', '79980f7c-75c3-4150-970a-2eb642ba10a8', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('adf4f33c-9c46-4b28-b93b-28e02d87fd39', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher2@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'teacher2@alrefaa.edu', 'ايمن الدسوقي', 'teacher') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', '211888384943', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', '7041a15c-8fb4-49e9-83c5-675518f028c9', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'ea20f422-671e-4659-9481-88195214782e', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'fec1dba8-a220-453d-80aa-f834d684a566', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8adf6505-ec07-40dc-834e-60418070b8b8', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('8e493b84-2799-417d-b232-c911386e0c98', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher3@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', 'teacher3@alrefaa.edu', 'صفوت زكريا', 'teacher') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', '213699550490', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', 'd0cd7175-d032-423c-b879-d82756064ef4', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8e493b84-2799-417d-b232-c911386e0c98', '59564b28-4921-4014-91be-6f46db650a91', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher4@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', 'teacher4@alrefaa.edu', 'حسن محمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', '240873480176', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', 'f8311834-5dd8-462e-9310-3d585e32ed70', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', '24b45e62-545e-408b-98e4-c46b9eaecf2a', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('06bb54d9-18d5-4ddb-a83d-8e3e8c2c2992', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher5@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', 'teacher5@alrefaa.edu', 'اشرف محمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '242160378593', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', 'f99c7c21-4118-45fe-8306-ffaf649aee54', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '491bf99f-1510-4605-86bc-25036b2b4d77', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '1d7b2c1d-7afd-4260-9926-0ed073c48418', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '4feadac2-d59f-4e88-9096-bb33ca284713', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('da3cca38-00d9-4557-b592-94c3227d16a7', '7b0e8ed2-9482-437a-b820-7b7384508462', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher6@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'teacher6@alrefaa.edu', 'اسامة صابر', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', '290255877221', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', '887f3e8c-bd79-4b44-b286-8322edcbc32e', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'd40c2147-7e84-44b4-bed2-cf8e03026102', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'f3805cbe-13e7-4673-a185-51c5e8306857', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ee2e638b-c2bb-4c38-995d-ea9db4ace877', '260b2a13-6b4e-41fb-9241-0019933f2d71', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher7@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'teacher7@alrefaa.edu', 'حسن عز الدين', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', '243767588450', 'اسلامية');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'b1672001-f96a-43ec-a63e-a340316824ef', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', '45a93414-9895-4d6c-bdc5-f1eda789902f', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c4faa3d-3680-4e1a-94e0-a97568a4ab65', '2ae284b7-d230-48a7-b237-4fd6263b022c', 'b6e8257d-3362-4101-b6dd-f488aeaa5347');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher8@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', 'teacher8@alrefaa.edu', 'طارق البهنسي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', '225038732779', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', '79980f7c-75c3-4150-970a-2eb642ba10a8', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f6e1efcc-9774-4020-b2e7-01c75f61ef8d', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher9@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', 'teacher9@alrefaa.edu', 'أسامة مختار', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', '239119190949', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', 'fec1dba8-a220-453d-80aa-f834d684a566', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d938ccc5-cee7-4f95-83a1-86bf80c43700', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher10@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', 'teacher10@alrefaa.edu', 'مصطفى الجيار', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', '240006450037', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c144241b-cb83-4d8d-9e6d-3f6eba0f356e', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher11@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', 'teacher11@alrefaa.edu', 'محمد فتحي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', '297435687825', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', 'ea20f422-671e-4659-9481-88195214782e', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', '7041a15c-8fb4-49e9-83c5-675518f028c9', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3f37e97c-98d5-437c-8db3-537a12b75a65', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher12@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', 'teacher12@alrefaa.edu', 'عادل ياسين', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', '277291518338', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('55edd26f-3ced-477d-a4d6-ab3d25a5eef5', '59564b28-4921-4014-91be-6f46db650a91', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher13@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', 'teacher13@alrefaa.edu', 'أيمن فتحي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', '218676243928', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', '24b45e62-545e-408b-98e4-c46b9eaecf2a', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f757c359-e8cc-4b69-93eb-374098e4fd7e', 'd0cd7175-d032-423c-b879-d82756064ef4', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher14@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', 'teacher14@alrefaa.edu', 'أحمد سرحان', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', '294552840106', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', '4feadac2-d59f-4e88-9096-bb33ca284713', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', '7b0e8ed2-9482-437a-b820-7b7384508462', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('acff6ad1-633e-488a-8330-788b9b21e4ab', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher15@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', 'teacher15@alrefaa.edu', 'طلال محمود', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', '256918149059', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', 'f99c7c21-4118-45fe-8306-ffaf649aee54', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', '491bf99f-1510-4605-86bc-25036b2b4d77', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d049bfe1-dfc9-4963-af8f-662dc797e3a5', 'f8311834-5dd8-462e-9310-3d585e32ed70', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher16@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', 'teacher16@alrefaa.edu', 'ابراهيم عبداللاه', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', '210725530497', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', '45a93414-9895-4d6c-bdc5-f1eda789902f', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('3048a249-74a4-49af-bace-cc44bcddf7af', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('76c47372-b83a-44f3-8196-9231456c5504', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher17@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', 'teacher17@alrefaa.edu', 'محمود الشحات عربي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', '296880834399', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76c47372-b83a-44f3-8196-9231456c5504', '260b2a13-6b4e-41fb-9241-0019933f2d71', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher18@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', 'teacher18@alrefaa.edu', 'المنهراوي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', '250992686696', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', '887f3e8c-bd79-4b44-b286-8322edcbc32e', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', 'd40c2147-7e84-44b4-bed2-cf8e03026102', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('893657ab-bb3f-4982-9368-39d1f8ad82fd', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher19@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', 'teacher19@alrefaa.edu', 'احمد العسكري', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', '273396954934', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('10ae3646-b1cf-429c-90a2-b5736f6905e2', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher20@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', 'teacher20@alrefaa.edu', 'حاتم فايز', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', '276376780315', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', 'b1672001-f96a-43ec-a63e-a340316824ef', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('cb7907ae-ee64-4b77-a601-ac2910684668', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher21@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', 'teacher21@alrefaa.edu', 'عمرو السيد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', '274275687506', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('33544eb0-5ca6-40f2-8388-c96b0b3722c3', '1d7b2c1d-7afd-4260-9926-0ed073c48418', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher22@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', 'teacher22@alrefaa.edu', 'عمر الخطيب', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', '241329623670', 'عربي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', '2ae284b7-d230-48a7-b237-4fd6263b022c', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4a6410c3-a66c-4a22-a77c-db69543e74b7', 'f3805cbe-13e7-4673-a185-51c5e8306857', 'd919c3b0-c5f6-4a71-b79c-14763d3a9005');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher23@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', 'teacher23@alrefaa.edu', 'لطفي المنزلاوي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', '280089780407', 'فرنسي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', '8d466769-0036-4141-adc7-9fc2d98472cd');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', '7041a15c-8fb4-49e9-83c5-675518f028c9', '8d466769-0036-4141-adc7-9fc2d98472cd');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('de4e5c7a-8eea-443f-bf32-f48cb5583cf3', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '8d466769-0036-4141-adc7-9fc2d98472cd');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher24@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', 'teacher24@alrefaa.edu', 'منصور الكاتب', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', '231754473428', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2bb2a665-e1b5-45d5-84ad-b09acd870f94', '79980f7c-75c3-4150-970a-2eb642ba10a8', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher25@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', 'teacher25@alrefaa.edu', 'كامل زهران', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', '227939568887', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', 'fec1dba8-a220-453d-80aa-f834d684a566', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', 'ea20f422-671e-4659-9481-88195214782e', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0cded09c-5c4f-4e45-8440-d14de48ad2b8', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher26@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', 'teacher26@alrefaa.edu', 'نعمان محمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', '284987262021', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('76509ab8-54e2-40f7-9ec0-e59409fa2629', '7041a15c-8fb4-49e9-83c5-675518f028c9', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher27@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', 'teacher27@alrefaa.edu', 'محمد الشامي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', '288451730656', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', 'd0cd7175-d032-423c-b879-d82756064ef4', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', '59564b28-4921-4014-91be-6f46db650a91', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c2ca8c79-63b9-46c5-8366-f35914b5e9f6', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher28@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', 'teacher28@alrefaa.edu', 'صالح صلاح', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '298226334744', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '24b45e62-545e-408b-98e4-c46b9eaecf2a', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('03c0f153-d13d-4caa-8766-82023150f118', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher29@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', 'teacher29@alrefaa.edu', 'ابراهيم عبد المحسن', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', '222777619119', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('08f7b28b-2304-4c49-a13d-e61ba6b3eaea', '1d7b2c1d-7afd-4260-9926-0ed073c48418', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher30@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', 'teacher30@alrefaa.edu', 'احمد حسانين', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', '233631710668', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', '7b0e8ed2-9482-437a-b820-7b7384508462', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f073a62d-fa21-4c0a-8431-d0cd139d2beb', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('aed7378d-0f21-4581-b948-15613d519112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher31@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('aed7378d-0f21-4581-b948-15613d519112', 'teacher31@alrefaa.edu', 'الفرغل', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('aed7378d-0f21-4581-b948-15613d519112', '297328056223', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('aed7378d-0f21-4581-b948-15613d519112', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('aed7378d-0f21-4581-b948-15613d519112', '4feadac2-d59f-4e88-9096-bb33ca284713', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('aed7378d-0f21-4581-b948-15613d519112', '491bf99f-1510-4605-86bc-25036b2b4d77', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('aed7378d-0f21-4581-b948-15613d519112', 'f99c7c21-4118-45fe-8306-ffaf649aee54', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher32@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', 'teacher32@alrefaa.edu', 'محمد احمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', '275795129634', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', '260b2a13-6b4e-41fb-9241-0019933f2d71', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', 'f8311834-5dd8-462e-9310-3d585e32ed70', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4e67aff3-f756-499b-919d-9137a5dad6b9', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher33@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', 'teacher33@alrefaa.edu', 'وسيم بركات', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', '256351933403', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', 'd40c2147-7e84-44b4-bed2-cf8e03026102', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e0aa6746-142e-435a-a484-6b8ebad3acf2', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher34@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', 'teacher34@alrefaa.edu', 'عمرو علي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', '265503850115', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('11dc7a72-f6f8-42e6-9397-646cbdc7d9c9', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('0a98e575-c856-470c-b329-1f818089d628', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher35@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0a98e575-c856-470c-b329-1f818089d628', 'teacher35@alrefaa.edu', 'نواف طالب', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('0a98e575-c856-470c-b329-1f818089d628', '236104212083', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('0a98e575-c856-470c-b329-1f818089d628', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0a98e575-c856-470c-b329-1f818089d628', '2ae284b7-d230-48a7-b237-4fd6263b022c', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0a98e575-c856-470c-b329-1f818089d628', 'f3805cbe-13e7-4673-a185-51c5e8306857', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('0a98e575-c856-470c-b329-1f818089d628', 'b1672001-f96a-43ec-a63e-a340316824ef', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher36@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', 'teacher36@alrefaa.edu', 'احمد اسماعيل', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '259076157165', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '887f3e8c-bd79-4b44-b286-8322edcbc32e', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('721d05e8-336b-4211-ac0f-420be6e67e79', '45a93414-9895-4d6c-bdc5-f1eda789902f', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('54f43295-4601-4aa6-b4db-af180cf8ab51', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher37@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('54f43295-4601-4aa6-b4db-af180cf8ab51', 'teacher37@alrefaa.edu', 'محمد حازم', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('54f43295-4601-4aa6-b4db-af180cf8ab51', '222485215269', 'انجليزي');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('54f43295-4601-4aa6-b4db-af180cf8ab51', '968faf83-baf1-440f-ad52-d57a41c1ef7d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('54f43295-4601-4aa6-b4db-af180cf8ab51', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', '968faf83-baf1-440f-ad52-d57a41c1ef7d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher38@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', 'teacher38@alrefaa.edu', 'محمود الشحات ر', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', '253808688147', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb918a5e-8035-4de0-af8f-58cff753c8a7', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher39@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', 'teacher39@alrefaa.edu', 'السيد أنور', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', '266682427492', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', '79980f7c-75c3-4150-970a-2eb642ba10a8', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d5ecdaff-0944-4e78-a341-ce7d94021af7', 'fec1dba8-a220-453d-80aa-f834d684a566', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher40@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', 'teacher40@alrefaa.edu', 'شريف أحمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', '292610062647', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', '59564b28-4921-4014-91be-6f46db650a91', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('8fb228df-0eef-4d36-a371-9b1c2adb0aaa', '7041a15c-8fb4-49e9-83c5-675518f028c9', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher41@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', 'teacher41@alrefaa.edu', 'أسامة الضوي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', '214147020398', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('141c708a-d448-4b43-a81e-e014e262dceb', 'ea20f422-671e-4659-9481-88195214782e', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher42@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', 'teacher42@alrefaa.edu', 'عثمان راضي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', '270805891767', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('39be7068-b485-4e7e-bd4a-d34a80060c73', 'd0cd7175-d032-423c-b879-d82756064ef4', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher43@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', 'teacher43@alrefaa.edu', 'خالد الشناوي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '253868412976', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('245b7517-6709-4e0a-af5f-a6cad0d12033', '24b45e62-545e-408b-98e4-c46b9eaecf2a', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher44@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', 'teacher44@alrefaa.edu', 'قصي الزعبي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', '279448842573', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', 'd40c2147-7e84-44b4-bed2-cf8e03026102', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('65f769ef-c71f-4f82-874b-ab8220adab5d', 'f3805cbe-13e7-4673-a185-51c5e8306857', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher45@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', 'teacher45@alrefaa.edu', 'سامح حسني', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '291321315475', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '260b2a13-6b4e-41fb-9241-0019933f2d71', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('12200f57-9be9-4545-a39b-80a898584f32', '4feadac2-d59f-4e88-9096-bb33ca284713', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher46@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', 'teacher46@alrefaa.edu', 'محمد بسام', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', '294712160112', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', 'f8311834-5dd8-462e-9310-3d585e32ed70', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', 'f99c7c21-4118-45fe-8306-ffaf649aee54', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d6040a09-5907-41b3-bfa4-93a4910ac0f9', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher47@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', 'teacher47@alrefaa.edu', 'محمد المهدي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '266013863634', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', 'b1672001-f96a-43ec-a63e-a340316824ef', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '2ae284b7-d230-48a7-b237-4fd6263b022c', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('77281e78-81d6-4944-9a9d-b612b41539b5', '45a93414-9895-4d6c-bdc5-f1eda789902f', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher48@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', 'teacher48@alrefaa.edu', 'عادل ابو االيزيد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '234969884299', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '491bf99f-1510-4605-86bc-25036b2b4d77', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '1d7b2c1d-7afd-4260-9926-0ed073c48418', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a3373c35-3bad-48b5-90e1-bd0c92a4e239', '7b0e8ed2-9482-437a-b820-7b7384508462', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher49@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', 'teacher49@alrefaa.edu', 'محمد مصطفى', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', '280734895417', 'رياضيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', '887f3e8c-bd79-4b44-b286-8322edcbc32e', '88cb1df6-0a46-46a8-880f-9eadb167380d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('186f84a1-da77-457a-adfd-9bc4ec227e6b', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', '88cb1df6-0a46-46a8-880f-9eadb167380d');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher50@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', 'teacher50@alrefaa.edu', 'رائد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '269066086802', 'كيمياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('c77fe2e5-f757-4807-b9d3-ca6ae254d069', '79980f7c-75c3-4150-970a-2eb642ba10a8', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher51@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', 'teacher51@alrefaa.edu', 'ناصر', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '219297489372', 'فيزياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '24b45e62-545e-408b-98e4-c46b9eaecf2a', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', 'd0cd7175-d032-423c-b879-d82756064ef4', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('bb92ccf1-a45d-4a45-97e4-8cb20a7f1195', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher52@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'teacher52@alrefaa.edu', 'ايهاب جمال', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '285973689850', 'فيزياء, علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '59564b28-4921-4014-91be-6f46db650a91', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '59564b28-4921-4014-91be-6f46db650a91', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'ea20f422-671e-4659-9481-88195214782e', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'ea20f422-671e-4659-9481-88195214782e', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'f8311834-5dd8-462e-9310-3d585e32ed70', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'f8311834-5dd8-462e-9310-3d585e32ed70', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '7b0e8ed2-9482-437a-b820-7b7384508462', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '7b0e8ed2-9482-437a-b820-7b7384508462', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('542c2f91-b7a8-4888-ada6-ae01c4d6fc3c', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher53@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', 'teacher53@alrefaa.edu', 'خليل احميد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', '291365916822', 'فيزياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', 'fec1dba8-a220-453d-80aa-f834d684a566', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('ab83b64a-9e50-4bf1-bdc8-2e7c78bf3a69', '79980f7c-75c3-4150-970a-2eb642ba10a8', 'e59aa4e3-d6ac-42bd-80ea-5268edba8835');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher54@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', 'teacher54@alrefaa.edu', 'كامل عبدالجواد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', '255095082656', 'كيمياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', 'd0cd7175-d032-423c-b879-d82756064ef4', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('4aab499e-7876-4368-89db-8e9ab64e4a1c', 'fec1dba8-a220-453d-80aa-f834d684a566', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher55@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', 'teacher55@alrefaa.edu', 'احمد عبدالفتاح', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '272376085087', 'كيمياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', 'ea20f422-671e-4659-9481-88195214782e', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '59564b28-4921-4014-91be-6f46db650a91', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6533af37-46f6-48e0-94af-565a4f963e74', '24b45e62-545e-408b-98e4-c46b9eaecf2a', '3a0fead3-7d80-456d-9a25-7c057b2c08e1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher56@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', 'teacher56@alrefaa.edu', 'أيمن فوزي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '243419220774', 'احياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '79980f7c-75c3-4150-970a-2eb642ba10a8', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '59564b28-4921-4014-91be-6f46db650a91', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6356ad05-4fe1-4645-9e90-fa9e57088034', 'ea20f422-671e-4659-9481-88195214782e', '947a54a3-265c-472d-9b41-2b01ce637ae2');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher57@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', 'teacher57@alrefaa.edu', 'أيمن زيدان', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '248615208180', 'احياء');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '24b45e62-545e-408b-98e4-c46b9eaecf2a', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', 'd0cd7175-d032-423c-b879-d82756064ef4', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', 'fec1dba8-a220-453d-80aa-f834d684a566', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '947a54a3-265c-472d-9b41-2b01ce637ae2');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('18e530ef-f881-4603-b9ce-e5bd8e954320', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '947a54a3-265c-472d-9b41-2b01ce637ae2');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher58@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'teacher58@alrefaa.edu', 'علي حسن', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '297685081133', 'جيولوجيا, علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '59564b28-4921-4014-91be-6f46db650a91', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '59564b28-4921-4014-91be-6f46db650a91', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'ea20f422-671e-4659-9481-88195214782e', '8d5865f3-85f2-45a5-8b78-9f64efa2bb23');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('68bf9993-67f9-4bae-9aab-28b9f8cdf367', 'ea20f422-671e-4659-9481-88195214782e', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher59@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', 'teacher59@alrefaa.edu', 'عماد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', '216949255027', 'علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', '260b2a13-6b4e-41fb-9241-0019933f2d71', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', '1d7b2c1d-7afd-4260-9926-0ed073c48418', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('89751f99-bd16-4a0a-9181-15159a49f318', '491bf99f-1510-4605-86bc-25036b2b4d77', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher60@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', 'teacher60@alrefaa.edu', 'محمد ختلان', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', '281366816199', 'علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', 'f99c7c21-4118-45fe-8306-ffaf649aee54', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', '4feadac2-d59f-4e88-9096-bb33ca284713', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('2c682181-7e42-4b37-b940-95c695e1fee4', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher61@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', 'teacher61@alrefaa.edu', 'جمال جابر', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', '239120400352', 'علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', '2ae284b7-d230-48a7-b237-4fd6263b022c', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', '45a93414-9895-4d6c-bdc5-f1eda789902f', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', 'b1672001-f96a-43ec-a63e-a340316824ef', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('31db211d-5623-442d-83bd-ae1b04d324be', '887f3e8c-bd79-4b44-b286-8322edcbc32e', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher62@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', 'teacher62@alrefaa.edu', 'حاتم علوم', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', '249424257892', 'علوم');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', 'd40c2147-7e84-44b4-bed2-cf8e03026102', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('63b555ec-a39b-4bb6-a7a5-1762b177bc14', 'f3805cbe-13e7-4673-a185-51c5e8306857', 'c94962dc-7f34-47f8-82ec-c54a8fdcc099');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher63@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'teacher63@alrefaa.edu', 'الفاتح محمد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '271000711953', 'اجتماعيات, تاريخ');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '64c93f95-738c-43f1-83d3-81e02b8ab340');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '64c93f95-738c-43f1-83d3-81e02b8ab340');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '64c93f95-738c-43f1-83d3-81e02b8ab340');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '7041a15c-8fb4-49e9-83c5-675518f028c9', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', '7041a15c-8fb4-49e9-83c5-675518f028c9', '64c93f95-738c-43f1-83d3-81e02b8ab340');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'd0cd7175-d032-423c-b879-d82756064ef4', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6c94e5a0-64be-452e-8e43-452a0427b849', 'd0cd7175-d032-423c-b879-d82756064ef4', '64c93f95-738c-43f1-83d3-81e02b8ab340');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher64@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'teacher64@alrefaa.edu', 'جبار عوض', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '238478656695', 'جغرافيا, اجتماعيات, دستور');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '7041a15c-8fb4-49e9-83c5-675518f028c9', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '7041a15c-8fb4-49e9-83c5-675518f028c9', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '7041a15c-8fb4-49e9-83c5-675518f028c9', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '79980f7c-75c3-4150-970a-2eb642ba10a8', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '79980f7c-75c3-4150-970a-2eb642ba10a8', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', '79980f7c-75c3-4150-970a-2eb642ba10a8', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'fec1dba8-a220-453d-80aa-f834d684a566', '761d2151-bc35-438a-869b-81d883c27b0b');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'fec1dba8-a220-453d-80aa-f834d684a566', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('7436f2a8-c854-42b8-9845-c5cb80b3a4ac', 'fec1dba8-a220-453d-80aa-f834d684a566', '09e94fc7-4abe-459b-9f50-7273be59daa8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher65@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'teacher65@alrefaa.edu', 'أسامة محفوظ', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '237367392276', 'فلسفة, دستور, علم نفس');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '582f8f8b-6836-4577-a683-c389ddf097ba');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '7041a15c-8fb4-49e9-83c5-675518f028c9', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '7041a15c-8fb4-49e9-83c5-675518f028c9', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '7041a15c-8fb4-49e9-83c5-675518f028c9', '582f8f8b-6836-4577-a683-c389ddf097ba');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '582f8f8b-6836-4577-a683-c389ddf097ba');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '582f8f8b-6836-4577-a683-c389ddf097ba');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '582f8f8b-6836-4577-a683-c389ddf097ba');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '5e63e4b8-eaa6-4eeb-8733-ced0ab3d204d');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '09e94fc7-4abe-459b-9f50-7273be59daa8');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('e35a0b72-bcec-4523-8e27-e2064e6c822b', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '582f8f8b-6836-4577-a683-c389ddf097ba');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher66@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', 'teacher66@alrefaa.edu', 'محمد عبد الحميد', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '231789746599', 'اجتماعيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '24b45e62-545e-408b-98e4-c46b9eaecf2a', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '4feadac2-d59f-4e88-9096-bb33ca284713', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '491bf99f-1510-4605-86bc-25036b2b4d77', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '7b0e8ed2-9482-437a-b820-7b7384508462', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', 'f8311834-5dd8-462e-9310-3d585e32ed70', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('064be66c-996e-42c3-8c75-b9260d96c65f', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher67@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'teacher67@alrefaa.edu', 'وائل', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '234966100140', 'اجتماعيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'f3805cbe-13e7-4673-a185-51c5e8306857', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '2ae284b7-d230-48a7-b237-4fd6263b022c', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '1d7b2c1d-7afd-4260-9926-0ed073c48418', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '260b2a13-6b4e-41fb-9241-0019933f2d71', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', '45a93414-9895-4d6c-bdc5-f1eda789902f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('f75c0a7c-aef1-4113-bea4-0db472604743', 'f99c7c21-4118-45fe-8306-ffaf649aee54', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher68@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'teacher68@alrefaa.edu', 'هاني', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', '257619425220', 'اجتماعيات');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', '887f3e8c-bd79-4b44-b286-8322edcbc32e', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'd40c2147-7e84-44b4-bed2-cf8e03026102', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('6b5af37b-209d-4622-9f33-dc972b83905f', 'b1672001-f96a-43ec-a63e-a340316824ef', 'c7c67f4d-a35c-4dae-8b66-b7b3d3bba3e9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher69@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'teacher69@alrefaa.edu', 'خليل سامي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '268782282607', 'حاسوب');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '79980f7c-75c3-4150-970a-2eb642ba10a8', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '7041a15c-8fb4-49e9-83c5-675518f028c9', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'c33f2bb8-80e5-48c2-9f5f-018e8f457cc6', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '1fb7518b-4a0b-4b5b-8878-8fcd3512393b', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '1b6c8a8f-cc43-4113-abb2-e83ed3bf30e3', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'f2396f36-0330-4dbf-82b0-6d3324b584b6', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'fec1dba8-a220-453d-80aa-f834d684a566', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'ea20f422-671e-4659-9481-88195214782e', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '59564b28-4921-4014-91be-6f46db650a91', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', '64a016cd-0d75-4ae1-9c58-7f6545ed5bfd', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'a9e0a1c5-4e0e-45d8-b337-f2968ff8ae0c', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('9c02d10b-3209-4365-ba5b-2acb0ea3ad07', 'cc4d791b-1145-40e1-9363-29fb01c5fe9f', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher70@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'teacher70@alrefaa.edu', 'حمزة', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '251055993318', 'حاسوب');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '887f3e8c-bd79-4b44-b286-8322edcbc32e', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '45a93414-9895-4d6c-bdc5-f1eda789902f', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'e8f274ca-6c76-4328-90f2-41b0385ecb18', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'd40c2147-7e84-44b4-bed2-cf8e03026102', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'f3805cbe-13e7-4673-a185-51c5e8306857', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '2ae284b7-d230-48a7-b237-4fd6263b022c', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'c4ef03b9-a66c-455e-8ca1-8db8991c9f31', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '59b543cf-4ef2-4fa8-8918-f6549da0d9b5', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', '4feadac2-d59f-4e88-9096-bb33ca284713', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('43b487e3-4a5f-435c-b507-c6f75e12ac90', 'f8311834-5dd8-462e-9310-3d585e32ed70', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher71@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', 'teacher71@alrefaa.edu', 'أحمد حمدي', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '279464836434', 'حاسوب');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '7d7a273f-63e7-4003-a5ee-3ac3eedf38b2', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '37986ff2-56e1-4813-b3f4-0aafd4f430ec', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', 'e8ce7ce3-c0a3-4d97-843e-48014958a3a7', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', 'd0cd7175-d032-423c-b879-d82756064ef4', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '776dfe93-7fb3-4cb1-8a02-a7effa670d88', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '491bf99f-1510-4605-86bc-25036b2b4d77', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '24b45e62-545e-408b-98e4-c46b9eaecf2a', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '26dfb75c-5fff-4de8-acbc-e91afd8dab2f', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', 'a8a2423e-93b0-45c6-a86a-2f9e45739cd5', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('a6c7604d-19e2-4872-b582-be727081073f', '7b0e8ed2-9482-437a-b820-7b7384508462', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) 
VALUES ('d3447652-2867-4e73-8460-6a0667323325', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher72@alrefaa.edu', crypt('password123', gen_salt('bf')), now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'teacher72@alrefaa.edu', 'عبد الرحمن', 'teacher');
INSERT INTO public.teachers (id, national_id, specialization) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '256222765356', 'حاسوب');
INSERT INTO public.teacher_subjects (teacher_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'baf53c97-a5cf-40aa-9fe6-47d8b3142160', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'cd8904ae-ef82-43c7-aea8-f2b688a6a252', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'f99c7c21-4118-45fe-8306-ffaf649aee54', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '69d3a4be-0ab6-4cf4-a1a9-561d13f59566', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'fbf6163e-1257-40d1-b3bb-b124e17d3fa0', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'b6efd326-6ce7-4114-b5b6-a401374c47f5', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '1d7b2c1d-7afd-4260-9926-0ed073c48418', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '2c2724d3-6e76-4fb1-ae96-e93cc95a53c3', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', '260b2a13-6b4e-41fb-9241-0019933f2d71', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'b1672001-f96a-43ec-a63e-a340316824ef', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');
INSERT INTO public.teacher_sections (teacher_id, section_id, subject_id) VALUES ('d3447652-2867-4e73-8460-6a0667323325', 'f48f64bf-8f73-42d1-8480-c6e0c5f8dc97', '3cdc5af3-885d-484e-b0a0-6ce158fa4fe4');

