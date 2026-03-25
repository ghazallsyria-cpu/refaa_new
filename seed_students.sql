-- Seed Data for Students

INSERT INTO public.classes (id, name, level) VALUES ('c7d51acd-9461-46df-b09a-7e1115958d89', 'الصف العاشر', 10);
INSERT INTO public.classes (id, name, level) VALUES ('81e9978d-972b-4588-8de0-df721bde3795', 'الصف الحادي عشر - ادبي', 11);
INSERT INTO public.classes (id, name, level) VALUES ('ce3df413-6f08-4b2d-b89d-535e2cee1ce8', 'الصف الحادي عشر - علمي', 11);
INSERT INTO public.classes (id, name, level) VALUES ('8f8a931b-684d-445f-a236-4a3a64adc8a0', 'الصف الثاني عشر - علمي', 12);
INSERT INTO public.classes (id, name, level) VALUES ('fe51a5f8-3aae-4478-a699-4332ab0172a8', 'الصف الثاني عشر - ادبي', 12);

INSERT INTO public.sections (id, class_id, name) VALUES ('4fe9fa4c-60cd-40a0-a58e-fc5814485090', 'c7d51acd-9461-46df-b09a-7e1115958d89', '1');
INSERT INTO public.sections (id, class_id, name) VALUES ('cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96', 'c7d51acd-9461-46df-b09a-7e1115958d89', '2');
INSERT INTO public.sections (id, class_id, name) VALUES ('2cccdc0b-0e74-455d-bdfb-060618e39f4a', 'c7d51acd-9461-46df-b09a-7e1115958d89', '3');
INSERT INTO public.sections (id, class_id, name) VALUES ('5f6862d8-562c-4e82-9433-0f8b6eaf6554', 'c7d51acd-9461-46df-b09a-7e1115958d89', '4');
INSERT INTO public.sections (id, class_id, name) VALUES ('7f3c665d-354d-408d-bacd-ea38dca0292a', 'c7d51acd-9461-46df-b09a-7e1115958d89', '5');
INSERT INTO public.sections (id, class_id, name) VALUES ('92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90', 'c7d51acd-9461-46df-b09a-7e1115958d89', '6');
INSERT INTO public.sections (id, class_id, name) VALUES ('3e7f75e1-1b0e-4633-97ea-b61f30ad79a8', '81e9978d-972b-4588-8de0-df721bde3795', '1');
INSERT INTO public.sections (id, class_id, name) VALUES ('03c68a0c-8410-4a2b-9c66-f7a7e2de1cef', 'ce3df413-6f08-4b2d-b89d-535e2cee1ce8', '1');
INSERT INTO public.sections (id, class_id, name) VALUES ('18badcb5-7a3d-49ea-bcfa-2043ffce3db1', 'ce3df413-6f08-4b2d-b89d-535e2cee1ce8', '2');
INSERT INTO public.sections (id, class_id, name) VALUES ('f303760c-0e82-4d8a-a842-e4b39e953bc8', 'ce3df413-6f08-4b2d-b89d-535e2cee1ce8', '3');
INSERT INTO public.sections (id, class_id, name) VALUES ('f8595ff6-f4dd-4627-9d64-215cca7a41b5', 'ce3df413-6f08-4b2d-b89d-535e2cee1ce8', '4');
INSERT INTO public.sections (id, class_id, name) VALUES ('6dcdc87d-f523-42c6-83f9-ead0413d5722', 'ce3df413-6f08-4b2d-b89d-535e2cee1ce8', '5');
INSERT INTO public.sections (id, class_id, name) VALUES ('f81df024-7c06-4b35-9e81-9c9224d427d0', '8f8a931b-684d-445f-a236-4a3a64adc8a0', '1');
INSERT INTO public.sections (id, class_id, name) VALUES ('5e234fdc-f96a-4974-a0b5-bc3766a0c4f9', '8f8a931b-684d-445f-a236-4a3a64adc8a0', '2');
INSERT INTO public.sections (id, class_id, name) VALUES ('918cff34-3313-4459-b0d8-49776f8575c3', '8f8a931b-684d-445f-a236-4a3a64adc8a0', '3');
INSERT INTO public.sections (id, class_id, name) VALUES ('fe22fbe7-3310-4b19-9c55-de11f79665a0', '8f8a931b-684d-445f-a236-4a3a64adc8a0', '4');
INSERT INTO public.sections (id, class_id, name) VALUES ('f73394eb-62f2-47be-be7f-ca982820ae7b', '8f8a931b-684d-445f-a236-4a3a64adc8a0', '5');
INSERT INTO public.sections (id, class_id, name) VALUES ('63167b6e-3c69-4fe5-9e6e-ee18d8a19b59', 'fe51a5f8-3aae-4478-a699-4332ab0172a8', '1');

-- Students
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('06570ed8-db02-4d93-b52b-d7f0767a9ace', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310060400405@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('06570ed8-db02-4d93-b52b-d7f0767a9ace', '310060400405@alrefaa.edu', 'اسامه محمد فرج العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('06570ed8-db02-4d93-b52b-d7f0767a9ace', '310060400405', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a796cdb4-7889-4c56-b748-c5cd2dca5473', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310040601795@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a796cdb4-7889-4c56-b748-c5cd2dca5473', '310040601795@alrefaa.edu', 'الوليد مزيد خلف مزيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a796cdb4-7889-4c56-b748-c5cd2dca5473', '310040601795', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('249d7644-daf7-477d-bbbc-f83e8fbb598f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309042502629@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('249d7644-daf7-477d-bbbc-f83e8fbb598f', '309042502629@alrefaa.edu', 'اياد محمد عادل عبدالرحيم حسن', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('249d7644-daf7-477d-bbbc-f83e8fbb598f', '309042502629', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ee9ad6d2-0069-4422-9973-4c0787ddca15', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310042800413@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ee9ad6d2-0069-4422-9973-4c0787ddca15', '310042800413@alrefaa.edu', 'حسين عبد الله حسين براك العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ee9ad6d2-0069-4422-9973-4c0787ddca15', '310042800413', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e828dae5-f3eb-4b60-a176-fb41ea5bb0de', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310110501977@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e828dae5-f3eb-4b60-a176-fb41ea5bb0de', '310110501977@alrefaa.edu', 'حمود عجيل هترن الجشعم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e828dae5-f3eb-4b60-a176-fb41ea5bb0de', '310110501977', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e774577f-c098-4c58-960f-d8c6b9da944d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050900115@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e774577f-c098-4c58-960f-d8c6b9da944d', '310050900115@alrefaa.edu', 'سعد مبارك عايد سالم غانم الصليلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e774577f-c098-4c58-960f-d8c6b9da944d', '310050900115', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4ff01bea-033c-4b1e-ad81-6b8402ee371b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311030700292@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4ff01bea-033c-4b1e-ad81-6b8402ee371b', '311030700292@alrefaa.edu', 'سليمان مسلط عيد محمد الهرشاني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4ff01bea-033c-4b1e-ad81-6b8402ee371b', '311030700292', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('097b684d-aae1-449e-9c31-dfd00337d1aa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310110402119@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('097b684d-aae1-449e-9c31-dfd00337d1aa', '310110402119@alrefaa.edu', 'طلال نايف مشهور الجنفاوي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('097b684d-aae1-449e-9c31-dfd00337d1aa', '310110402119', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('849fb848-f760-4e6c-8d33-616d0f1f77bb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310040901747@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('849fb848-f760-4e6c-8d33-616d0f1f77bb', '310040901747@alrefaa.edu', 'عباس فالح عباس ناصر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('849fb848-f760-4e6c-8d33-616d0f1f77bb', '310040901747', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('93af46be-7816-4cd8-8f2e-6a8922331f13', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310122202042@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('93af46be-7816-4cd8-8f2e-6a8922331f13', '310122202042@alrefaa.edu', 'عبدالعزيز ضيدان فلاح العجمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('93af46be-7816-4cd8-8f2e-6a8922331f13', '310122202042', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8ce04697-4950-416c-83d0-0b6fe60f78ad', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310070900817@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8ce04697-4950-416c-83d0-0b6fe60f78ad', '310070900817@alrefaa.edu', 'عبدالعزيز عمر ملوح الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8ce04697-4950-416c-83d0-0b6fe60f78ad', '310070900817', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f9f41999-b462-45a6-a9ef-c7f31849682e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021801067@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f9f41999-b462-45a6-a9ef-c7f31849682e', '311021801067@alrefaa.edu', 'عبدالوهاب محمد خشان عبد الله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f9f41999-b462-45a6-a9ef-c7f31849682e', '311021801067', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('752e5f55-4829-4f41-8f38-ed23b2a6e3cb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311020300279@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('752e5f55-4829-4f41-8f38-ed23b2a6e3cb', '311020300279@alrefaa.edu', 'عثمان فهد مطلق العازمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('752e5f55-4829-4f41-8f38-ed23b2a6e3cb', '311020300279', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('766bc7f6-a2eb-421b-8c2f-e24aea306d4c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121500814@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('766bc7f6-a2eb-421b-8c2f-e24aea306d4c', '310121500814@alrefaa.edu', 'فيصل عواد مرفوع الفضلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('766bc7f6-a2eb-421b-8c2f-e24aea306d4c', '310121500814', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ef5d2cc3-3ddf-4acb-be04-d8a7c75e86ef', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310072500366@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ef5d2cc3-3ddf-4acb-be04-d8a7c75e86ef', '310072500366@alrefaa.edu', 'كايد منصور كايد العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ef5d2cc3-3ddf-4acb-be04-d8a7c75e86ef', '310072500366', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('93e9fd3d-1e62-4422-834a-784592db2070', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309111902029@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('93e9fd3d-1e62-4422-834a-784592db2070', '309111902029@alrefaa.edu', 'لورنس جابر مناور جاسم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('93e9fd3d-1e62-4422-834a-784592db2070', '309111902029', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('74f2b415-becc-4a2d-84e7-8f0704302c45', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311030400935@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('74f2b415-becc-4a2d-84e7-8f0704302c45', '311030400935@alrefaa.edu', 'محمد حسين محمد الشمالي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('74f2b415-becc-4a2d-84e7-8f0704302c45', '311030400935', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('40317290-bb5d-4a42-9427-d0b1a4559f22', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310073001315@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('40317290-bb5d-4a42-9427-d0b1a4559f22', '310073001315@alrefaa.edu', 'محمد خالد كثير مانع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('40317290-bb5d-4a42-9427-d0b1a4559f22', '310073001315', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('928ac60b-e003-4540-a21f-857f0b51cefa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310041301559@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('928ac60b-e003-4540-a21f-857f0b51cefa', '310041301559@alrefaa.edu', 'محمد رضا حامد على', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('928ac60b-e003-4540-a21f-857f0b51cefa', '310041301559', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('12f3b603-0ba0-45da-a81d-054f30db34e0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310070502181@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('12f3b603-0ba0-45da-a81d-054f30db34e0', '310070502181@alrefaa.edu', 'مشعان خالد فهد الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('12f3b603-0ba0-45da-a81d-054f30db34e0', '310070502181', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('08335e47-55e8-49a3-82a9-c8a2c0d64b91', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311010301163@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('08335e47-55e8-49a3-82a9-c8a2c0d64b91', '311010301163@alrefaa.edu', 'ناصر محمد السويلم الرشيدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('08335e47-55e8-49a3-82a9-c8a2c0d64b91', '311010301163', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e1cb4c4a-a61d-45ae-bff8-4a2ef9c796a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310101701213@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e1cb4c4a-a61d-45ae-bff8-4a2ef9c796a7', '310101701213@alrefaa.edu', 'نايف سعود نايف محمد الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e1cb4c4a-a61d-45ae-bff8-4a2ef9c796a7', '310101701213', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('16ddf122-6cef-421f-90e7-aea976b7db49', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310112401793@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('16ddf122-6cef-421f-90e7-aea976b7db49', '310112401793@alrefaa.edu', 'وليد بدر مناور فالح العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('16ddf122-6cef-421f-90e7-aea976b7db49', '310112401793', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c259cd07-7dec-4f4c-8d38-421b3c3a9aa9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121202235@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c259cd07-7dec-4f4c-8d38-421b3c3a9aa9', '310121202235@alrefaa.edu', 'يوسف حمود منيف المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c259cd07-7dec-4f4c-8d38-421b3c3a9aa9', '310121202235', '4fe9fa4c-60cd-40a0-a58e-fc5814485090');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('41ec40eb-5eb0-4585-aed8-e3bccbe4f91f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310071800236@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('41ec40eb-5eb0-4585-aed8-e3bccbe4f91f', '310071800236@alrefaa.edu', 'أحمد حمدان مبارك الذايدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('41ec40eb-5eb0-4585-aed8-e3bccbe4f91f', '310071800236', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ce4c7d36-a9ad-47f7-84c4-ca463fa2ebb1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310041700146@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ce4c7d36-a9ad-47f7-84c4-ca463fa2ebb1', '310041700146@alrefaa.edu', 'أحمد علي دحيلان الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ce4c7d36-a9ad-47f7-84c4-ca463fa2ebb1', '310041700146', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('664f6baf-9f06-402f-9fb2-e613cd5f3155', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310061301249@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('664f6baf-9f06-402f-9fb2-e613cd5f3155', '310061301249@alrefaa.edu', 'احمد فهد عبدالله المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('664f6baf-9f06-402f-9fb2-e613cd5f3155', '310061301249', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4af6dbfe-f07d-4c40-b333-2b4321348b71', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310111300878@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4af6dbfe-f07d-4c40-b333-2b4321348b71', '310111300878@alrefaa.edu', 'بندر بدر عوض العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4af6dbfe-f07d-4c40-b333-2b4321348b71', '310111300878', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b8c5d389-2f5c-4ba8-b787-f54d7cc3d130', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310031600758@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b8c5d389-2f5c-4ba8-b787-f54d7cc3d130', '310031600758@alrefaa.edu', 'جراح سعود بجاد مشهور طعيس السعيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b8c5d389-2f5c-4ba8-b787-f54d7cc3d130', '310031600758', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bdf9009e-f045-4414-af5b-e9d2ed4e2d3a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310060301802@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bdf9009e-f045-4414-af5b-e9d2ed4e2d3a', '310060301802@alrefaa.edu', 'شملان محمد شملان العازمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bdf9009e-f045-4414-af5b-e9d2ed4e2d3a', '310060301802', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6fb30193-286f-4bf6-ac26-82177daa7b95', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310112502068@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6fb30193-286f-4bf6-ac26-82177daa7b95', '310112502068@alrefaa.edu', 'ضاري عبدالله عصام الكندري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6fb30193-286f-4bf6-ac26-82177daa7b95', '310112502068', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('702ffd81-97a9-446f-be65-c76d72043a15', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310102300809@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('702ffd81-97a9-446f-be65-c76d72043a15', '310102300809@alrefaa.edu', 'عبدالرحمن مشعل حمود خلف عبدالله العدواني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('702ffd81-97a9-446f-be65-c76d72043a15', '310102300809', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('53b91b6f-da63-4a7d-a586-29cb424e8cfb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050400604@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('53b91b6f-da63-4a7d-a586-29cb424e8cfb', '310050400604@alrefaa.edu', 'عبدالعزيز سعود زبن نايف الجنفاوي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('53b91b6f-da63-4a7d-a586-29cb424e8cfb', '310050400604', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b2101a62-363c-477d-9e75-71105935892f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021500117@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b2101a62-363c-477d-9e75-71105935892f', '311021500117@alrefaa.edu', 'عبدالله عايد بردي مناحي ظاهر المطوطح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b2101a62-363c-477d-9e75-71105935892f', '311021500117', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('da4f0c16-b44f-466f-883d-d52b238d03fa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090300384@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('da4f0c16-b44f-466f-883d-d52b238d03fa', '310090300384@alrefaa.edu', 'عبدالله فارس برغش المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('da4f0c16-b44f-466f-883d-d52b238d03fa', '310090300384', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('098ffb6b-d394-414b-987b-9294c23f4622', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310091600442@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('098ffb6b-d394-414b-987b-9294c23f4622', '310091600442@alrefaa.edu', 'عثمان علي الاسيمر العازمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('098ffb6b-d394-414b-987b-9294c23f4622', '310091600442', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5b789c0b-f44c-4701-9046-3ae652e9a653', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311011000362@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5b789c0b-f44c-4701-9046-3ae652e9a653', '311011000362@alrefaa.edu', 'عمر عدنان فهد فراج العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5b789c0b-f44c-4701-9046-3ae652e9a653', '311011000362', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3c8b2bac-c81c-4fd0-be83-2b290246548e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310110300585@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3c8b2bac-c81c-4fd0-be83-2b290246548e', '310110300585@alrefaa.edu', 'عيسى فالح علي الطويل الرشيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3c8b2bac-c81c-4fd0-be83-2b290246548e', '310110300585', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1cf9ff21-4fb6-4202-b789-f9ed3cbbbec1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311022300045@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1cf9ff21-4fb6-4202-b789-f9ed3cbbbec1', '311022300045@alrefaa.edu', 'عيسى مشعل غانم الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1cf9ff21-4fb6-4202-b789-f9ed3cbbbec1', '311022300045', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d6c7e7ba-e3fd-4800-a3c4-fcb7993fb680', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311022002072@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d6c7e7ba-e3fd-4800-a3c4-fcb7993fb680', '311022002072@alrefaa.edu', 'فارس عبدالرحمن عيسى السليم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d6c7e7ba-e3fd-4800-a3c4-fcb7993fb680', '311022002072', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9337eeb2-c536-471b-9c67-7b5d482a03ac', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '913882300043@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9337eeb2-c536-471b-9c67-7b5d482a03ac', '913882300043@alrefaa.edu', 'فهد حمد مضحي الفضلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9337eeb2-c536-471b-9c67-7b5d482a03ac', '913882300043', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3fe3c644-581b-4210-b20e-a8c46c26608d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310071700243@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3fe3c644-581b-4210-b20e-a8c46c26608d', '310071700243@alrefaa.edu', 'فيصل محمد راضى السعيدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3fe3c644-581b-4210-b20e-a8c46c26608d', '310071700243', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('275755e2-91fe-4c79-a13d-d1ddd7d39788', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121300062@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('275755e2-91fe-4c79-a13d-d1ddd7d39788', '310121300062@alrefaa.edu', 'محمد فهد شنيف المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('275755e2-91fe-4c79-a13d-d1ddd7d39788', '310121300062', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2c66d05c-2a0d-4521-86be-20d343447c57', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311031301365@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2c66d05c-2a0d-4521-86be-20d343447c57', '311031301365@alrefaa.edu', 'محمد ناصر هاشم هلال مجبل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2c66d05c-2a0d-4521-86be-20d343447c57', '311031301365', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b1725f96-04f0-4946-b99c-7eac3f80d408', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050200602@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b1725f96-04f0-4946-b99c-7eac3f80d408', '310050200602@alrefaa.edu', 'ناصر فهد لماس مشعل مسلم الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b1725f96-04f0-4946-b99c-7eac3f80d408', '310050200602', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('43bede99-649a-41f9-85d0-1dae5b4d6643', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121700656@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('43bede99-649a-41f9-85d0-1dae5b4d6643', '310121700656@alrefaa.edu', 'نايف خالد محمد العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('43bede99-649a-41f9-85d0-1dae5b4d6643', '310121700656', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3fbb8c6a-8f02-48cc-97d8-b706e6905546', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310043001795@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3fbb8c6a-8f02-48cc-97d8-b706e6905546', '310043001795@alrefaa.edu', 'نواف طلال غانم دهيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3fbb8c6a-8f02-48cc-97d8-b706e6905546', '310043001795', 'cb8b7400-fb6d-4e99-a5ec-0eb65fd65e96');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e156ba2d-1eef-4ff8-9dcc-b70142291e29', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310033001329@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e156ba2d-1eef-4ff8-9dcc-b70142291e29', '310033001329@alrefaa.edu', 'احمد محمد النوري غازي جليعب السعيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e156ba2d-1eef-4ff8-9dcc-b70142291e29', '310033001329', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('10ce24fd-0d67-45ff-8f64-4dc26071a12a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102002854@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('10ce24fd-0d67-45ff-8f64-4dc26071a12a', '309102002854@alrefaa.edu', 'اسامه سعود السعدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('10ce24fd-0d67-45ff-8f64-4dc26071a12a', '309102002854', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b0dfaa04-f7bc-4244-b89e-4c3a83f1a0f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310030301027@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b0dfaa04-f7bc-4244-b89e-4c3a83f1a0f1', '310030301027@alrefaa.edu', 'تركي حمود سالم العدواني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b0dfaa04-f7bc-4244-b89e-4c3a83f1a0f1', '310030301027', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('af48f038-1e3d-4a9f-b2e8-54b0ca5d9ec5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090500968@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('af48f038-1e3d-4a9f-b2e8-54b0ca5d9ec5', '310090500968@alrefaa.edu', 'جارالله محسن دغيليب العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('af48f038-1e3d-4a9f-b2e8-54b0ca5d9ec5', '310090500968', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('81dd130f-0c73-4498-87c9-a0210f2e62f9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311011200831@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('81dd130f-0c73-4498-87c9-a0210f2e62f9', '311011200831@alrefaa.edu', 'حمود محمد حمود الهاجري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('81dd130f-0c73-4498-87c9-a0210f2e62f9', '311011200831', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('63bc7cdb-3a50-41f8-8a51-77b7bb5288ac', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311012800281@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('63bc7cdb-3a50-41f8-8a51-77b7bb5288ac', '311012800281@alrefaa.edu', 'خلف لافى خلف البرازي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('63bc7cdb-3a50-41f8-8a51-77b7bb5288ac', '311012800281', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e05a9fbe-a9e4-4d29-8b09-d32a473784a8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311012600466@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e05a9fbe-a9e4-4d29-8b09-d32a473784a8', '311012600466@alrefaa.edu', 'راشد سالم فهد منصر العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e05a9fbe-a9e4-4d29-8b09-d32a473784a8', '311012600466', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5a97e855-6852-4a35-96bc-03b536b9cc7a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121300417@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5a97e855-6852-4a35-96bc-03b536b9cc7a', '310121300417@alrefaa.edu', 'زيد هادى نزال الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5a97e855-6852-4a35-96bc-03b536b9cc7a', '310121300417', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('16122acd-3fc2-4739-a4f7-06b13653ddf1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021501646@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('16122acd-3fc2-4739-a4f7-06b13653ddf1', '311021501646@alrefaa.edu', 'سعد خليفه سليمان سالم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('16122acd-3fc2-4739-a4f7-06b13653ddf1', '311021501646', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('058c0a07-6b63-4359-af36-9a99c5a22d84', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310111200594@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('058c0a07-6b63-4359-af36-9a99c5a22d84', '310111200594@alrefaa.edu', 'سعود رجعان محمد الماجدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('058c0a07-6b63-4359-af36-9a99c5a22d84', '310111200594', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b787c861-6446-43ba-90ee-7ded9ff1bda1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050502758@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b787c861-6446-43ba-90ee-7ded9ff1bda1', '310050502758@alrefaa.edu', 'سعود معيض راكان منصور', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b787c861-6446-43ba-90ee-7ded9ff1bda1', '310050502758', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e59dc97f-e56a-4996-be95-cbee87b1d0a8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021600361@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e59dc97f-e56a-4996-be95-cbee87b1d0a8', '311021600361@alrefaa.edu', 'سلطان مطلق عاجل رحيل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e59dc97f-e56a-4996-be95-cbee87b1d0a8', '311021600361', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('07f34796-1e34-442f-b817-9e12b6c70a17', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090702447@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('07f34796-1e34-442f-b817-9e12b6c70a17', '310090702447@alrefaa.edu', 'صالح فايز صالح الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('07f34796-1e34-442f-b817-9e12b6c70a17', '310090702447', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('74a9514d-9f1c-4546-8f1f-77ae88a34f8e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310100602037@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('74a9514d-9f1c-4546-8f1f-77ae88a34f8e', '310100602037@alrefaa.edu', 'عبدالرحمن بدر مناحى نعمه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('74a9514d-9f1c-4546-8f1f-77ae88a34f8e', '310100602037', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7e1b9a08-1ace-4920-a0f3-fd3c0dd0696b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311010601975@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7e1b9a08-1ace-4920-a0f3-fd3c0dd0696b', '311010601975@alrefaa.edu', 'عبدالعزيز حبيب سعد خزعل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7e1b9a08-1ace-4920-a0f3-fd3c0dd0696b', '311010601975', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cbe8488a-2404-4c78-866c-993541d4a56b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310071700462@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cbe8488a-2404-4c78-866c-993541d4a56b', '310071700462@alrefaa.edu', 'عبدالله منصور ناصر العكشان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cbe8488a-2404-4c78-866c-993541d4a56b', '310071700462', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f0da0ff7-eece-45cc-bb00-af9cfbd40d92', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310080400525@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f0da0ff7-eece-45cc-bb00-af9cfbd40d92', '310080400525@alrefaa.edu', 'عبدالوهاب أحمد مريح الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f0da0ff7-eece-45cc-bb00-af9cfbd40d92', '310080400525', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8475eced-c9a4-4907-b119-74c3135ba498', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090702439@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8475eced-c9a4-4907-b119-74c3135ba498', '310090702439@alrefaa.edu', 'عثمان فايز صالح الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8475eced-c9a4-4907-b119-74c3135ba498', '310090702439', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1b2d8d05-af93-4b89-841a-29c8e6725b3b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310110700941@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1b2d8d05-af93-4b89-841a-29c8e6725b3b', '310110700941@alrefaa.edu', 'فواز خالد صعفك العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1b2d8d05-af93-4b89-841a-29c8e6725b3b', '310110700941', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5cbb6f2a-154e-4be2-9ca2-c4503710f51b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311012702008@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5cbb6f2a-154e-4be2-9ca2-c4503710f51b', '311012702008@alrefaa.edu', 'محمد طلال البو على', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5cbb6f2a-154e-4be2-9ca2-c4503710f51b', '311012702008', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6db515f5-1f02-43a8-8590-eca51c9f2ec7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082102038@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6db515f5-1f02-43a8-8590-eca51c9f2ec7', '310082102038@alrefaa.edu', 'محمد فايز مناحى نعمه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6db515f5-1f02-43a8-8590-eca51c9f2ec7', '310082102038', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6e7c1494-b7af-4817-81f8-f89faa65e674', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310080900503@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6e7c1494-b7af-4817-81f8-f89faa65e674', '310080900503@alrefaa.edu', 'مشاري عبدالله خليفه المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6e7c1494-b7af-4817-81f8-f89faa65e674', '310080900503', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9a755334-8cc0-4f10-9152-859e0acd8c24', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090602358@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9a755334-8cc0-4f10-9152-859e0acd8c24', '310090602358@alrefaa.edu', 'نواف عطا الله صالح جدوع عشوان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9a755334-8cc0-4f10-9152-859e0acd8c24', '310090602358', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fa615c3a-73f0-439f-9766-d039e9ebdf39', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310070402199@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fa615c3a-73f0-439f-9766-d039e9ebdf39', '310070402199@alrefaa.edu', 'يعقوب فواز عبد الله صالح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fa615c3a-73f0-439f-9766-d039e9ebdf39', '310070402199', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('41f1e3ea-d4ae-4a9f-9aba-6fd6d916fb0a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310062201469@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('41f1e3ea-d4ae-4a9f-9aba-6fd6d916fb0a', '310062201469@alrefaa.edu', 'يوسف صلاح عيسى فلاح مفلح المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('41f1e3ea-d4ae-4a9f-9aba-6fd6d916fb0a', '310062201469', '2cccdc0b-0e74-455d-bdfb-060618e39f4a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b547e322-4778-466a-8c1e-24c018e689ad', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310062802416@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b547e322-4778-466a-8c1e-24c018e689ad', '310062802416@alrefaa.edu', 'بندر محمد ذرب نايف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b547e322-4778-466a-8c1e-24c018e689ad', '310062802416', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('024e1dca-e4f9-44ef-866b-7db856e87396', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311012901146@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('024e1dca-e4f9-44ef-866b-7db856e87396', '311012901146@alrefaa.edu', 'حمد صالح مساعد الرويعي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('024e1dca-e4f9-44ef-866b-7db856e87396', '311012901146', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('536def0b-3463-402a-8a8f-748aae29b6ce', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090400617@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('536def0b-3463-402a-8a8f-748aae29b6ce', '310090400617@alrefaa.edu', 'حمود نصار حمود العدوانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('536def0b-3463-402a-8a8f-748aae29b6ce', '310090400617', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('63cfd71f-447a-4038-b754-7d42b5d79d53', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307103101636@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('63cfd71f-447a-4038-b754-7d42b5d79d53', '307103101636@alrefaa.edu', 'خالد عطاالله متعب المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('63cfd71f-447a-4038-b754-7d42b5d79d53', '307103101636', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('04f2539d-283e-4bba-bd0d-2ae75b3b5bbf', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082001077@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('04f2539d-283e-4bba-bd0d-2ae75b3b5bbf', '310082001077@alrefaa.edu', 'سالم سعد ابراهيم النايف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('04f2539d-283e-4bba-bd0d-2ae75b3b5bbf', '310082001077', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('eafaf465-c671-470c-9ad5-72709b3dc62d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311010500285@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('eafaf465-c671-470c-9ad5-72709b3dc62d', '311010500285@alrefaa.edu', 'سالم شافي سالم شافي سالم العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('eafaf465-c671-470c-9ad5-72709b3dc62d', '311010500285', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f7110e75-98e7-4b76-bb90-1e3b71cc2f54', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050500955@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f7110e75-98e7-4b76-bb90-1e3b71cc2f54', '310050500955@alrefaa.edu', 'سعد صالح حمدان حماد العجل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f7110e75-98e7-4b76-bb90-1e3b71cc2f54', '310050500955', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('badb6119-a5ba-44b9-a1d2-a8011c719030', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310062501357@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('badb6119-a5ba-44b9-a1d2-a8011c719030', '310062501357@alrefaa.edu', 'صالح فيصل صالح راكان العجمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('badb6119-a5ba-44b9-a1d2-a8011c719030', '310062501357', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8b51c8cc-3ec6-49d3-a504-80e853470d73', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310083000527@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8b51c8cc-3ec6-49d3-a504-80e853470d73', '310083000527@alrefaa.edu', 'طلال عشوى جلوى الصانع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8b51c8cc-3ec6-49d3-a504-80e853470d73', '310083000527', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('79b53781-da19-4d1f-8abe-56b56dd2037a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310122800456@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('79b53781-da19-4d1f-8abe-56b56dd2037a', '310122800456@alrefaa.edu', 'عبدالعزيز دنهاش الحسين', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('79b53781-da19-4d1f-8abe-56b56dd2037a', '310122800456', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2bb2b4bf-efa9-4407-86b8-557774bb9120', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310041701982@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2bb2b4bf-efa9-4407-86b8-557774bb9120', '310041701982@alrefaa.edu', 'عبدالعزيز سعود فرحان عايد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2bb2b4bf-efa9-4407-86b8-557774bb9120', '310041701982', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b9c93d1e-aadd-43f4-bf2b-636a97eed183', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310032900082@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b9c93d1e-aadd-43f4-bf2b-636a97eed183', '310032900082@alrefaa.edu', 'عبدالله حميدي عبدالله الرشيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b9c93d1e-aadd-43f4-bf2b-636a97eed183', '310032900082', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ba340d05-ddd1-4cdb-a4b2-1a5266353535', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310051400403@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ba340d05-ddd1-4cdb-a4b2-1a5266353535', '310051400403@alrefaa.edu', 'عبيد دخيل عبيد دخيل شافي جزاع العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ba340d05-ddd1-4cdb-a4b2-1a5266353535', '310051400403', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f12623e3-05d8-4fb4-ba95-9b9663a3fea4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310092802572@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f12623e3-05d8-4fb4-ba95-9b9663a3fea4', '310092802572@alrefaa.edu', 'علي احمد عبيد عبيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f12623e3-05d8-4fb4-ba95-9b9663a3fea4', '310092802572', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('51dcfa70-3e35-4c10-9679-9ca73f40e00f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311011001672@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('51dcfa70-3e35-4c10-9679-9ca73f40e00f', '311011001672@alrefaa.edu', 'علي خالد عبيد عبد الرحمن', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('51dcfa70-3e35-4c10-9679-9ca73f40e00f', '311011001672', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0d26fe35-20c8-49f4-826a-4bfbb9f9f8c5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310120400029@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0d26fe35-20c8-49f4-826a-4bfbb9f9f8c5', '310120400029@alrefaa.edu', 'فهاد عبدالله فهاد العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0d26fe35-20c8-49f4-826a-4bfbb9f9f8c5', '310120400029', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('31b30e10-7e0e-4f7a-ae53-a4da4f5eba10', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310112702422@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('31b30e10-7e0e-4f7a-ae53-a4da4f5eba10', '310112702422@alrefaa.edu', 'محمد شريف محمد محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('31b30e10-7e0e-4f7a-ae53-a4da4f5eba10', '310112702422', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b46125c9-774c-4b2e-85cc-e6d109a59b5e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310121700453@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b46125c9-774c-4b2e-85cc-e6d109a59b5e', '310121700453@alrefaa.edu', 'محمد مسعود معيوف السعيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b46125c9-774c-4b2e-85cc-e6d109a59b5e', '310121700453', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9ed1b34c-ae47-4136-8c40-47f7f852ef10', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310120400811@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9ed1b34c-ae47-4136-8c40-47f7f852ef10', '310120400811@alrefaa.edu', 'محمد نافع حمود الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9ed1b34c-ae47-4136-8c40-47f7f852ef10', '310120400811', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d87950b6-0b1d-4d34-ad40-bc1bc4760700', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310031200279@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d87950b6-0b1d-4d34-ad40-bc1bc4760700', '310031200279@alrefaa.edu', 'محمد يوسف غالي الصليلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d87950b6-0b1d-4d34-ad40-bc1bc4760700', '310031200279', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d2e9588a-20f1-45a6-8f84-a707a470cb5f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310102500333@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d2e9588a-20f1-45a6-8f84-a707a470cb5f', '310102500333@alrefaa.edu', 'معاذ راشد عياد الضفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d2e9588a-20f1-45a6-8f84-a707a470cb5f', '310102500333', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cf40aa59-d49b-4da4-b836-ad237f86734a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309042501837@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cf40aa59-d49b-4da4-b836-ad237f86734a', '309042501837@alrefaa.edu', 'همام محمد خليل اسماعيل عسكر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cf40aa59-d49b-4da4-b836-ad237f86734a', '309042501837', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('40d8d3f4-cbc2-49b3-bf08-9ff16687a518', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050202034@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('40d8d3f4-cbc2-49b3-bf08-9ff16687a518', '310050202034@alrefaa.edu', 'يعقوب خليفه زبن ثوينى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('40d8d3f4-cbc2-49b3-bf08-9ff16687a518', '310050202034', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('09e58db6-22e0-44e0-aa7d-5f6b206e9e55', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310101002412@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('09e58db6-22e0-44e0-aa7d-5f6b206e9e55', '310101002412@alrefaa.edu', 'يوسف خليفه صويلح الماجدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('09e58db6-22e0-44e0-aa7d-5f6b206e9e55', '310101002412', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('021e00b0-90a3-47d7-b512-2e2b830f04ed', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310053001895@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('021e00b0-90a3-47d7-b512-2e2b830f04ed', '310053001895@alrefaa.edu', 'يوسف فيصل قاسم صابط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('021e00b0-90a3-47d7-b512-2e2b830f04ed', '310053001895', '5f6862d8-562c-4e82-9433-0f8b6eaf6554');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2d793a53-7ecd-46dd-9707-b00a937e0e34', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090400561@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2d793a53-7ecd-46dd-9707-b00a937e0e34', '310090400561@alrefaa.edu', 'أحمد سعد ناصر حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2d793a53-7ecd-46dd-9707-b00a937e0e34', '310090400561', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2880ffca-d160-4ba5-ae69-59c3cb6f1864', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310040702537@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2880ffca-d160-4ba5-ae69-59c3cb6f1864', '310040702537@alrefaa.edu', 'أحمد فهد رشيد الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2880ffca-d160-4ba5-ae69-59c3cb6f1864', '310040702537', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1e3978e0-89a0-4608-a15d-039de6f52922', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310091000682@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1e3978e0-89a0-4608-a15d-039de6f52922', '310091000682@alrefaa.edu', 'أسماعيل جبير النجم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1e3978e0-89a0-4608-a15d-039de6f52922', '310091000682', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a31aebb0-a6e3-4ece-970f-ac6354ae071b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082800098@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a31aebb0-a6e3-4ece-970f-ac6354ae071b', '310082800098@alrefaa.edu', 'الحميدي شلاش ريكان طارش', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a31aebb0-a6e3-4ece-970f-ac6354ae071b', '310082800098', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e420cfcc-a657-4a8c-b306-8d9698d1ea6f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310091700988@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e420cfcc-a657-4a8c-b306-8d9698d1ea6f', '310091700988@alrefaa.edu', 'تركي راشد ضبيعان السليمانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e420cfcc-a657-4a8c-b306-8d9698d1ea6f', '310091700988', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('eaf7b4d9-481f-45f4-9d10-3543223ee49f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121002315@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('eaf7b4d9-481f-45f4-9d10-3543223ee49f', '309121002315@alrefaa.edu', 'جراح حمود تركي بكوري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('eaf7b4d9-481f-45f4-9d10-3543223ee49f', '309121002315', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('dce01892-2a25-4768-9660-7eddf1039ec8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310112700494@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('dce01892-2a25-4768-9660-7eddf1039ec8', '310112700494@alrefaa.edu', 'حسن مشارى دغش الحجرف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('dce01892-2a25-4768-9660-7eddf1039ec8', '310112700494', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5c5eff95-e3bb-49f9-be48-a6bc2d29d434', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309091502692@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5c5eff95-e3bb-49f9-be48-a6bc2d29d434', '309091502692@alrefaa.edu', 'خالد خلف نعيم عويد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5c5eff95-e3bb-49f9-be48-a6bc2d29d434', '309091502692', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('12a937ce-1e18-4981-9dd6-b6758a7e8c52', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082200068@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('12a937ce-1e18-4981-9dd6-b6758a7e8c52', '310082200068@alrefaa.edu', 'خالد فهد علي المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('12a937ce-1e18-4981-9dd6-b6758a7e8c52', '310082200068', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('de15488e-a9d7-4631-9abd-013db1abe358', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021300748@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('de15488e-a9d7-4631-9abd-013db1abe358', '311021300748@alrefaa.edu', 'خالد وليد عبدالله الحميدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('de15488e-a9d7-4631-9abd-013db1abe358', '311021300748', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0a6eff39-0dc9-47b7-8db4-bbb72147fd68', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311022800226@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0a6eff39-0dc9-47b7-8db4-bbb72147fd68', '311022800226@alrefaa.edu', 'راشد خالد محمد الحريجي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0a6eff39-0dc9-47b7-8db4-bbb72147fd68', '311022800226', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7c1cbe1c-86fc-4acf-acd2-7cc7c967f3d8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082400561@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7c1cbe1c-86fc-4acf-acd2-7cc7c967f3d8', '310082400561@alrefaa.edu', 'سالم سعد سالم المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7c1cbe1c-86fc-4acf-acd2-7cc7c967f3d8', '310082400561', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('529b12a3-b77a-405e-b0c5-46a83f38484b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310100500823@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('529b12a3-b77a-405e-b0c5-46a83f38484b', '310100500823@alrefaa.edu', 'سعد عامر سطام عويد العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('529b12a3-b77a-405e-b0c5-46a83f38484b', '310100500823', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('59f4ea7b-e211-42f9-ae80-305c979baf4c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050601203@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('59f4ea7b-e211-42f9-ae80-305c979baf4c', '310050601203@alrefaa.edu', 'سلطان جميل حورى الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('59f4ea7b-e211-42f9-ae80-305c979baf4c', '310050601203', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0a722f88-c716-41fe-b1af-84be89c8770b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311030800162@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0a722f88-c716-41fe-b1af-84be89c8770b', '311030800162@alrefaa.edu', 'سليمان سعد حبيب ضامر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0a722f88-c716-41fe-b1af-84be89c8770b', '311030800162', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2ff90028-a95c-4831-83e6-2665825053e6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309071100047@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2ff90028-a95c-4831-83e6-2665825053e6', '309071100047@alrefaa.edu', 'عبدالرحمن بندر خلف المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2ff90028-a95c-4831-83e6-2665825053e6', '309071100047', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b2a27beb-38d8-482d-982e-5554b56834f8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311011202036@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b2a27beb-38d8-482d-982e-5554b56834f8', '311011202036@alrefaa.edu', 'عبدالرحمن خالد عذاب فهد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b2a27beb-38d8-482d-982e-5554b56834f8', '311011202036', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f6c19f25-e7c6-43c0-af0d-4abdbebd102f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310081500747@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f6c19f25-e7c6-43c0-af0d-4abdbebd102f', '310081500747@alrefaa.edu', 'عبدالله خالد مدالله الصليلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f6c19f25-e7c6-43c0-af0d-4abdbebd102f', '310081500747', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('23cc0dc4-bed0-449c-bfa4-07f8e38439fb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082900136@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('23cc0dc4-bed0-449c-bfa4-07f8e38439fb', '310082900136@alrefaa.edu', 'عثمان فيصل عايد رمضان منيف بداح بزيع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('23cc0dc4-bed0-449c-bfa4-07f8e38439fb', '310082900136', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1a29152c-04e2-4488-bdcb-def31e4f8e1f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311010301104@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1a29152c-04e2-4488-bdcb-def31e4f8e1f', '311010301104@alrefaa.edu', 'عثمان مشاري عوض المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1a29152c-04e2-4488-bdcb-def31e4f8e1f', '311010301104', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b939f2e7-0565-425a-8373-f4e2d89f0ef9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310081702285@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b939f2e7-0565-425a-8373-f4e2d89f0ef9', '310081702285@alrefaa.edu', 'عمر شهاب احمد الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b939f2e7-0565-425a-8373-f4e2d89f0ef9', '310081702285', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2d1d4144-d6e6-4ca8-a8e8-595374445ac9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310080202107@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2d1d4144-d6e6-4ca8-a8e8-595374445ac9', '310080202107@alrefaa.edu', 'عوض مسعود عوض حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2d1d4144-d6e6-4ca8-a8e8-595374445ac9', '310080202107', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bd00dba7-afc3-4525-a520-60ed474e14b7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310060201684@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bd00dba7-afc3-4525-a520-60ed474e14b7', '310060201684@alrefaa.edu', 'عيد محمد عيد محمد الهرشانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bd00dba7-afc3-4525-a520-60ed474e14b7', '310060201684', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1cd3ff4e-4f08-4e79-9311-2550a3002bb2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310082900259@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1cd3ff4e-4f08-4e79-9311-2550a3002bb2', '310082900259@alrefaa.edu', 'مرزوق محمد مرزوق رسام مرزوق', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1cd3ff4e-4f08-4e79-9311-2550a3002bb2', '310082900259', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b9a66df5-5eff-4a8a-ba27-c43797583d13', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310090800784@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b9a66df5-5eff-4a8a-ba27-c43797583d13', '310090800784@alrefaa.edu', 'هذال عبد الله خلف فلاح سند محمد العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b9a66df5-5eff-4a8a-ba27-c43797583d13', '310090800784', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b89db947-0053-4808-be08-41b1245961dd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311021901316@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b89db947-0053-4808-be08-41b1245961dd', '311021901316@alrefaa.edu', 'يوسف حامد حمد حميدي عيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b89db947-0053-4808-be08-41b1245961dd', '311021901316', '7f3c665d-354d-408d-bacd-ea38dca0292a');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2a253ed5-d570-49d9-965e-faa000313622', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310052101798@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2a253ed5-d570-49d9-965e-faa000313622', '310052101798@alrefaa.edu', 'ابراهيم مساعد كريم عبيد الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2a253ed5-d570-49d9-965e-faa000313622', '310052101798', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4d7a53a6-d110-41a5-8e1c-998aee82a39c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110300245@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4d7a53a6-d110-41a5-8e1c-998aee82a39c', '309110300245@alrefaa.edu', 'احمد نواف خضير بداح الصليلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4d7a53a6-d110-41a5-8e1c-998aee82a39c', '309110300245', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c2c7ac24-7c1d-4906-a399-1f194518cdf8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310122500613@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c2c7ac24-7c1d-4906-a399-1f194518cdf8', '310122500613@alrefaa.edu', 'بندر محمد طلال يوسف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c2c7ac24-7c1d-4906-a399-1f194518cdf8', '310122500613', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cf59dc7c-0560-44d5-a05e-b3ab37b2998d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310101701918@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cf59dc7c-0560-44d5-a05e-b3ab37b2998d', '310101701918@alrefaa.edu', 'حمزه لطيف فياض جابر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cf59dc7c-0560-44d5-a05e-b3ab37b2998d', '310101701918', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('faaf9b9f-bc0f-49dd-b412-06368e83ccec', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310061101597@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('faaf9b9f-bc0f-49dd-b412-06368e83ccec', '310061101597@alrefaa.edu', 'ساير نائل مجيد خلف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('faaf9b9f-bc0f-49dd-b412-06368e83ccec', '310061101597', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c9b12d69-957d-428d-b412-0029c4f756dd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310051101892@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c9b12d69-957d-428d-b412-0029c4f756dd', '310051101892@alrefaa.edu', 'صالح فؤاد صالح العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c9b12d69-957d-428d-b412-0029c4f756dd', '310051101892', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cb22356c-b543-4232-8e49-01f57062a786', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310060602162@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cb22356c-b543-4232-8e49-01f57062a786', '310060602162@alrefaa.edu', 'عبدالجليل عيد عايد الرشيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cb22356c-b543-4232-8e49-01f57062a786', '310060602162', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4bf8a883-9361-4bbe-adb9-767bb14e298c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310120202305@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4bf8a883-9361-4bbe-adb9-767bb14e298c', '310120202305@alrefaa.edu', 'عبدالحميد اسامه عبدالحميد عبدالبديع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4bf8a883-9361-4bbe-adb9-767bb14e298c', '310120202305', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('70589285-10da-4557-bfb4-5543e47156dc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310042802216@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('70589285-10da-4557-bfb4-5543e47156dc', '310042802216@alrefaa.edu', 'عبدالسلام احمد رخيص هليل ظاهر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('70589285-10da-4557-bfb4-5543e47156dc', '310042802216', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('65142862-e984-44da-8358-a2682de57dfc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102700732@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('65142862-e984-44da-8358-a2682de57dfc', '309102700732@alrefaa.edu', 'عبدالله خالد فلاح الشريف المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('65142862-e984-44da-8358-a2682de57dfc', '309102700732', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('63898f19-67a9-449a-891a-4e1d97e28a2a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310081000101@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('63898f19-67a9-449a-891a-4e1d97e28a2a', '310081000101@alrefaa.edu', 'عبدالله يوسف الياس عبدالله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('63898f19-67a9-449a-891a-4e1d97e28a2a', '310081000101', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4bc919ef-ec18-4a45-bda0-53e9c13d2e9f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '913882300042@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4bc919ef-ec18-4a45-bda0-53e9c13d2e9f', '913882300042@alrefaa.edu', 'عبيد أنور عبيد حمد خشان الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4bc919ef-ec18-4a45-bda0-53e9c13d2e9f', '913882300042', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('84ed0b0f-2b7d-4e86-b463-9697c22eb6b4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310092100626@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('84ed0b0f-2b7d-4e86-b463-9697c22eb6b4', '310092100626@alrefaa.edu', 'علي هزاع سليمان عتيق الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('84ed0b0f-2b7d-4e86-b463-9697c22eb6b4', '310092100626', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e181d873-05c2-4ad1-8d27-f07a2440ff52', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311020802025@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e181d873-05c2-4ad1-8d27-f07a2440ff52', '311020802025@alrefaa.edu', 'عمر احمد الحريرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e181d873-05c2-4ad1-8d27-f07a2440ff52', '311020802025', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c083ee98-a5a1-4655-9ef0-390407025c97', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310021702339@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c083ee98-a5a1-4655-9ef0-390407025c97', '310021702339@alrefaa.edu', 'عمر مهند برغل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c083ee98-a5a1-4655-9ef0-390407025c97', '310021702339', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('acb5d72c-3c8d-4097-99af-fcfd0957a853', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310110400949@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('acb5d72c-3c8d-4097-99af-fcfd0957a853', '310110400949@alrefaa.edu', 'فهد مشعل محمد الفضلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('acb5d72c-3c8d-4097-99af-fcfd0957a853', '310110400949', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d669bb46-e9a1-40b3-a436-46b475c78836', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310112501196@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d669bb46-e9a1-40b3-a436-46b475c78836', '310112501196@alrefaa.edu', 'فيصل فهد نهار الحسيني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d669bb46-e9a1-40b3-a436-46b475c78836', '310112501196', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bb15d98e-77f8-4c36-96de-e329c56655d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050102906@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bb15d98e-77f8-4c36-96de-e329c56655d3', '310050102906@alrefaa.edu', 'محمد أحمد السيد أحمد زيدان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bb15d98e-77f8-4c36-96de-e329c56655d3', '310050102906', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8cd9565b-4a7f-4763-b985-6f00ec9f3583', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310050602265@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8cd9565b-4a7f-4763-b985-6f00ec9f3583', '310050602265@alrefaa.edu', 'محمد سعود جابر سنان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8cd9565b-4a7f-4763-b985-6f00ec9f3583', '310050602265', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a4d7e6cd-14e9-4df8-a1d3-91b4a38d279d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310032601349@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a4d7e6cd-14e9-4df8-a1d3-91b4a38d279d', '310032601349@alrefaa.edu', 'محمد فيصل خلف عواد جدعان السعيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a4d7e6cd-14e9-4df8-a1d3-91b4a38d279d', '310032601349', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('05775bf7-8f78-43bc-af60-9c692203bb69', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310081400324@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('05775bf7-8f78-43bc-af60-9c692203bb69', '310081400324@alrefaa.edu', 'محمد لؤى الزعبى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('05775bf7-8f78-43bc-af60-9c692203bb69', '310081400324', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('241cbe2a-cb11-4135-8805-5e6f4c44c02d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311013000921@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('241cbe2a-cb11-4135-8805-5e6f4c44c02d', '311013000921@alrefaa.edu', 'محمد مفرح راشد فرحان العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('241cbe2a-cb11-4135-8805-5e6f4c44c02d', '311013000921', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('68706ebc-21aa-484e-8f27-e3eab2b31813', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310111102134@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('68706ebc-21aa-484e-8f27-e3eab2b31813', '310111102134@alrefaa.edu', 'مشاري عبدالله طعيس محمد رويعي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('68706ebc-21aa-484e-8f27-e3eab2b31813', '310111102134', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8aca6320-9a8a-4c30-9613-798f7ec3f67c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102502306@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8aca6320-9a8a-4c30-9613-798f7ec3f67c', '309102502306@alrefaa.edu', 'ناصر علي عبدالله محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8aca6320-9a8a-4c30-9613-798f7ec3f67c', '309102502306', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f4f780ac-d64f-4955-833c-c0662e9e6804', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310060702323@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f4f780ac-d64f-4955-833c-c0662e9e6804', '310060702323@alrefaa.edu', 'يامن محمد سمير الصيفي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f4f780ac-d64f-4955-833c-c0662e9e6804', '310060702323', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3ea5e81c-70b8-49cd-a7fe-8304161e2e97', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311022002398@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3ea5e81c-70b8-49cd-a7fe-8304161e2e97', '311022002398@alrefaa.edu', 'يحيى محمد يسرى سلام', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3ea5e81c-70b8-49cd-a7fe-8304161e2e97', '311022002398', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4eef4c36-a1e4-4871-8a83-8b18b926d69e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310052302266@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4eef4c36-a1e4-4871-8a83-8b18b926d69e', '310052302266@alrefaa.edu', 'يوسف احمد عبده فضل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4eef4c36-a1e4-4871-8a83-8b18b926d69e', '310052302266', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('39d14bbd-9738-4c4c-bd9a-338c1a4de745', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '311010602257@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('39d14bbd-9738-4c4c-bd9a-338c1a4de745', '311010602257@alrefaa.edu', 'يوسف مساعد عيد حسين', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('39d14bbd-9738-4c4c-bd9a-338c1a4de745', '311010602257', '92e54a65-2ee3-49ed-9b61-fd7ffbf4dd90');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f23b0066-e9dc-4d67-ad46-1628e2c9562e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309081601953@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f23b0066-e9dc-4d67-ad46-1628e2c9562e', '309081601953@alrefaa.edu', 'بندر أحمد ماجد السويط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f23b0066-e9dc-4d67-ad46-1628e2c9562e', '309081601953', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cdafb763-3685-4f4a-ba22-80af9e715cb5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309091000262@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cdafb763-3685-4f4a-ba22-80af9e715cb5', '309091000262@alrefaa.edu', 'بندر نواف لماس الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cdafb763-3685-4f4a-ba22-80af9e715cb5', '309091000262', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c166eb4d-5d14-4a52-853e-1e9d61af05bd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310011001459@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c166eb4d-5d14-4a52-853e-1e9d61af05bd', '310011001459@alrefaa.edu', 'حمد حمدى فرحان الرشيدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c166eb4d-5d14-4a52-853e-1e9d61af05bd', '310011001459', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9cbbc1dd-6e55-4880-bb2e-5d9d6706806c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309111900218@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9cbbc1dd-6e55-4880-bb2e-5d9d6706806c', '309111900218@alrefaa.edu', 'حمود وصل الله خليفه المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9cbbc1dd-6e55-4880-bb2e-5d9d6706806c', '309111900218', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b8251c2b-1cf9-4e0b-81c0-c70b5130865c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310011800306@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b8251c2b-1cf9-4e0b-81c0-c70b5130865c', '310011800306@alrefaa.edu', 'خالد نواف مبارك وتيد العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b8251c2b-1cf9-4e0b-81c0-c70b5130865c', '310011800306', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('24624a7c-f2e4-4823-952c-fc2fde7c22b7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309030800338@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('24624a7c-f2e4-4823-952c-fc2fde7c22b7', '309030800338@alrefaa.edu', 'زيد حامد زيد الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('24624a7c-f2e4-4823-952c-fc2fde7c22b7', '309030800338', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b9aa85c2-27de-44e9-a4ee-b7bfb2f8ed4d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309021600035@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b9aa85c2-27de-44e9-a4ee-b7bfb2f8ed4d', '309021600035@alrefaa.edu', 'سعد منصور سعد البناق', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b9aa85c2-27de-44e9-a4ee-b7bfb2f8ed4d', '309021600035', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('19121393-0775-441e-8e2e-c6d0cccef74f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110402399@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('19121393-0775-441e-8e2e-c6d0cccef74f', '309110402399@alrefaa.edu', 'سلمان عبد الرحمن صالح الفضلى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('19121393-0775-441e-8e2e-c6d0cccef74f', '309110402399', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0046a40a-bdff-4e80-8b4b-a380f1ba8e91', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112700686@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0046a40a-bdff-4e80-8b4b-a380f1ba8e91', '308112700686@alrefaa.edu', 'عبدالرحمن صالح عبدالله العريفان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0046a40a-bdff-4e80-8b4b-a380f1ba8e91', '308112700686', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('adec5324-46f5-4fe3-b671-818e503e3d3c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032900797@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('adec5324-46f5-4fe3-b671-818e503e3d3c', '309032900797@alrefaa.edu', 'عبدالرحمن مخلد الشنيفى الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('adec5324-46f5-4fe3-b671-818e503e3d3c', '309032900797', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f334ff35-c360-4e00-b799-c085fd2b4322', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309122000709@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f334ff35-c360-4e00-b799-c085fd2b4322', '309122000709@alrefaa.edu', 'عبدالعزيز طارق خالد الصليلى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f334ff35-c360-4e00-b799-c085fd2b4322', '309122000709', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8a8cbc2f-23b8-49db-8778-f63180a8f848', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308111302256@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8a8cbc2f-23b8-49db-8778-f63180a8f848', '308111302256@alrefaa.edu', 'عبدالله سعد ضاحى نعمه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8a8cbc2f-23b8-49db-8778-f63180a8f848', '308111302256', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a1a2d7d8-8743-4377-9612-d3ba6c2ab332', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309122600915@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a1a2d7d8-8743-4377-9612-d3ba6c2ab332', '309122600915@alrefaa.edu', 'عبدالله مبارك وحش العجمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a1a2d7d8-8743-4377-9612-d3ba6c2ab332', '309122600915', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('11ba5e77-3c19-4b2d-a6ee-ec4ea4985309', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121201701@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('11ba5e77-3c19-4b2d-a6ee-ec4ea4985309', '309121201701@alrefaa.edu', 'ماجد عبدالله فريح الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('11ba5e77-3c19-4b2d-a6ee-ec4ea4985309', '309121201701', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('92a2ba15-e235-41ce-9825-f3383767864b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308052800107@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('92a2ba15-e235-41ce-9825-f3383767864b', '308052800107@alrefaa.edu', 'محمد خالد سويري العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('92a2ba15-e235-41ce-9825-f3383767864b', '308052800107', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d5e3c47c-e0ec-4e9c-8dd9-a63a6870ccc4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308111800896@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d5e3c47c-e0ec-4e9c-8dd9-a63a6870ccc4', '308111800896@alrefaa.edu', 'محمد ضيدان فلاح العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d5e3c47c-e0ec-4e9c-8dd9-a63a6870ccc4', '308111800896', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8d2db27e-acd0-450e-ab27-bdf7555ab371', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010702333@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8d2db27e-acd0-450e-ab27-bdf7555ab371', '310010702333@alrefaa.edu', 'مطلق حامد نغيش الحسينى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8d2db27e-acd0-450e-ab27-bdf7555ab371', '310010702333', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('82b22af6-807e-4051-af9e-ee7a99497453', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309071800326@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('82b22af6-807e-4051-af9e-ee7a99497453', '309071800326@alrefaa.edu', 'معاذ سعد فهيد المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('82b22af6-807e-4051-af9e-ee7a99497453', '309071800326', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8e6cf852-09b5-4b3b-b0e9-b88fb5f2513d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309043001578@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8e6cf852-09b5-4b3b-b0e9-b88fb5f2513d', '309043001578@alrefaa.edu', 'موسى محمد فرج العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8e6cf852-09b5-4b3b-b0e9-b88fb5f2513d', '309043001578', '3e7f75e1-1b0e-4633-97ea-b61f30ad79a8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('70fabedd-be9a-4650-9107-b3fb12cb7999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308082600034@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('70fabedd-be9a-4650-9107-b3fb12cb7999', '308082600034@alrefaa.edu', 'أحمد فواز سليمان العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('70fabedd-be9a-4650-9107-b3fb12cb7999', '308082600034', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d7d8a031-06aa-4da3-9c94-aa9ad03c7a86', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309033002083@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d7d8a031-06aa-4da3-9c94-aa9ad03c7a86', '309033002083@alrefaa.edu', 'أحمد لطيف فياض جابر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d7d8a031-06aa-4da3-9c94-aa9ad03c7a86', '309033002083', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('eb4cd019-4c22-4c6f-994b-b124446f35c0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310011502069@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('eb4cd019-4c22-4c6f-994b-b124446f35c0', '310011502069@alrefaa.edu', 'أنس مشعل محمد هليل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('eb4cd019-4c22-4c6f-994b-b124446f35c0', '310011502069', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('394c2c98-de35-4d1f-874a-20e489cd9f8c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072400017@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('394c2c98-de35-4d1f-874a-20e489cd9f8c', '309072400017@alrefaa.edu', 'ابراهيم احمد حمدان العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('394c2c98-de35-4d1f-874a-20e489cd9f8c', '309072400017', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1ddc86f1-0460-49cf-8e87-a3292b04a1ed', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309040802046@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1ddc86f1-0460-49cf-8e87-a3292b04a1ed', '309040802046@alrefaa.edu', 'ابراهيم محمد راشد حسن مرزوق', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1ddc86f1-0460-49cf-8e87-a3292b04a1ed', '309040802046', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e47538db-ce22-406c-a12a-346fdf702698', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080401853@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e47538db-ce22-406c-a12a-346fdf702698', '309080401853@alrefaa.edu', 'براك خالد حمدان الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e47538db-ce22-406c-a12a-346fdf702698', '309080401853', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4c0a87c2-426b-4eee-8c18-0b41e201b03c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110502277@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4c0a87c2-426b-4eee-8c18-0b41e201b03c', '309110502277@alrefaa.edu', 'بندر سند مطشر الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4c0a87c2-426b-4eee-8c18-0b41e201b03c', '309110502277', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a11e3fda-8867-4a82-81c6-74ddd0327f07', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309122900475@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a11e3fda-8867-4a82-81c6-74ddd0327f07', '309122900475@alrefaa.edu', 'تركي خالد فهد الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a11e3fda-8867-4a82-81c6-74ddd0327f07', '309122900475', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7cd3db28-ac2d-48e2-967b-2d05623bd44e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309113000758@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7cd3db28-ac2d-48e2-967b-2d05623bd44e', '309113000758@alrefaa.edu', 'حسن راشد عبد الله العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7cd3db28-ac2d-48e2-967b-2d05623bd44e', '309113000758', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9716c041-6811-4f26-b257-c5c3550510ff', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121702135@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9716c041-6811-4f26-b257-c5c3550510ff', '309121702135@alrefaa.edu', 'حسين طعمه دعبول ساير', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9716c041-6811-4f26-b257-c5c3550510ff', '309121702135', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('02404ea2-f87f-4b4b-b98e-9ebf625148b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120400952@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('02404ea2-f87f-4b4b-b98e-9ebf625148b1', '309120400952@alrefaa.edu', 'حمد فهد مزعل الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('02404ea2-f87f-4b4b-b98e-9ebf625148b1', '309120400952', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('46b78c93-e229-4042-9b5d-7a32d7017625', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309051701523@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('46b78c93-e229-4042-9b5d-7a32d7017625', '309051701523@alrefaa.edu', 'خالد عبدالرحمن صغير العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('46b78c93-e229-4042-9b5d-7a32d7017625', '309051701523', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('92300912-1f5f-48af-9d1f-33d5af2aa0c9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032600452@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('92300912-1f5f-48af-9d1f-33d5af2aa0c9', '309032600452@alrefaa.edu', 'راشد عبدالله صغير العجمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('92300912-1f5f-48af-9d1f-33d5af2aa0c9', '309032600452', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3a370d32-cc9e-4a3a-95ac-383ebaeaa8b4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010602199@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3a370d32-cc9e-4a3a-95ac-383ebaeaa8b4', '310010602199@alrefaa.edu', 'راكان وليد خالد الدويده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3a370d32-cc9e-4a3a-95ac-383ebaeaa8b4', '310010602199', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7531f742-17b9-4a89-becf-f010e57c6cd9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309062400419@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7531f742-17b9-4a89-becf-f010e57c6cd9', '309062400419@alrefaa.edu', 'زيد ضاحي حجي الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7531f742-17b9-4a89-becf-f010e57c6cd9', '309062400419', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4022b6b1-d916-4a00-9f28-9e5769e759f4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082100229@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4022b6b1-d916-4a00-9f28-9e5769e759f4', '309082100229@alrefaa.edu', 'زيد محمد نزال الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4022b6b1-d916-4a00-9f28-9e5769e759f4', '309082100229', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4c5f6729-36d5-49e6-abe2-4297d7d0c6ed', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309053100115@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4c5f6729-36d5-49e6-abe2-4297d7d0c6ed', '309053100115@alrefaa.edu', 'سلطان محمد عيد الهرشاني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4c5f6729-36d5-49e6-abe2-4297d7d0c6ed', '309053100115', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ad72e540-6de5-4121-9cb1-6c4015d2416e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310021100223@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ad72e540-6de5-4121-9cb1-6c4015d2416e', '310021100223@alrefaa.edu', 'عبدالعزيز غازى عبيد الحسينى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ad72e540-6de5-4121-9cb1-6c4015d2416e', '310021100223', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6ba60e64-5850-4127-a4f5-48851335a35c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309090300781@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6ba60e64-5850-4127-a4f5-48851335a35c', '309090300781@alrefaa.edu', 'عبدالعزيز محمد حسن الانصارى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6ba60e64-5850-4127-a4f5-48851335a35c', '309090300781', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e725fc42-c7d1-4eb7-bd97-6821365abc04', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309040201929@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e725fc42-c7d1-4eb7-bd97-6821365abc04', '309040201929@alrefaa.edu', 'عبدالعزيز ناصر عذاب الرمضان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e725fc42-c7d1-4eb7-bd97-6821365abc04', '309040201929', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('dcdd4ea7-6da1-4a1e-81a1-10de66b34a33', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102800397@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('dcdd4ea7-6da1-4a1e-81a1-10de66b34a33', '309102800397@alrefaa.edu', 'عبدالله حمد صالح المطوطح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('dcdd4ea7-6da1-4a1e-81a1-10de66b34a33', '309102800397', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e22f12bf-6af4-4ac3-ba6e-dc6366e95ab1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308080901722@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e22f12bf-6af4-4ac3-ba6e-dc6366e95ab1', '308080901722@alrefaa.edu', 'علي عوده حمود رشم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e22f12bf-6af4-4ac3-ba6e-dc6366e95ab1', '308080901722', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fe2f1675-4677-403c-83fe-8347d11b8a0b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120400688@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fe2f1675-4677-403c-83fe-8347d11b8a0b', '309120400688@alrefaa.edu', 'ناصر ضويحى سيف العجمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fe2f1675-4677-403c-83fe-8347d11b8a0b', '309120400688', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3d5e0fcf-e91e-4e2c-97d2-8a535c8c0a1d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082401697@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3d5e0fcf-e91e-4e2c-97d2-8a535c8c0a1d', '309082401697@alrefaa.edu', 'هادي ظاهر هادي العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3d5e0fcf-e91e-4e2c-97d2-8a535c8c0a1d', '309082401697', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1b945e0a-3d59-42d7-9a09-bfb9fccddb76', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110700011@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1b945e0a-3d59-42d7-9a09-bfb9fccddb76', '309110700011@alrefaa.edu', 'يوسف موسى حمود العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1b945e0a-3d59-42d7-9a09-bfb9fccddb76', '309110700011', '03c68a0c-8410-4a2b-9c66-f7a7e2de1cef');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4bde5336-db4d-431b-8015-dc22b8fbd697', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309052101634@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4bde5336-db4d-431b-8015-dc22b8fbd697', '309052101634@alrefaa.edu', 'أسامه زيد طعمه الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4bde5336-db4d-431b-8015-dc22b8fbd697', '309052101634', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b9b8cd2d-e3d9-490a-b1d9-95e87f5ad95b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309081400385@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b9b8cd2d-e3d9-490a-b1d9-95e87f5ad95b', '309081400385@alrefaa.edu', 'ادم احمد عبدالمنعم حسن محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b9b8cd2d-e3d9-490a-b1d9-95e87f5ad95b', '309081400385', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e19c994c-af44-43d9-9fe7-3b07f98ca9f7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102002643@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e19c994c-af44-43d9-9fe7-3b07f98ca9f7', '309102002643@alrefaa.edu', 'ادم محمد يسري سلام', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e19c994c-af44-43d9-9fe7-3b07f98ca9f7', '309102002643', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5ef7adac-4794-4fa5-95f8-5f8fdc1b2275', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102900646@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5ef7adac-4794-4fa5-95f8-5f8fdc1b2275', '309102900646@alrefaa.edu', 'براك عبدالرحمن محمد العلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5ef7adac-4794-4fa5-95f8-5f8fdc1b2275', '309102900646', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d8107b5a-3f9e-4238-a563-f9d171da24ee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310031102003@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d8107b5a-3f9e-4238-a563-f9d171da24ee', '310031102003@alrefaa.edu', 'حسين احمد عبد الامير عطيوى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d8107b5a-3f9e-4238-a563-f9d171da24ee', '310031102003', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5cc9da53-3431-43b5-b324-7fab4abce2b5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310030200023@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5cc9da53-3431-43b5-b324-7fab4abce2b5', '310030200023@alrefaa.edu', 'حمد صالح عابر الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5cc9da53-3431-43b5-b324-7fab4abce2b5', '310030200023', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9ae18132-caf7-4fdd-bfdc-4b4da7d01d1e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309093002659@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9ae18132-caf7-4fdd-bfdc-4b4da7d01d1e', '309093002659@alrefaa.edu', 'حمزه عماد عبدالله مبروك', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9ae18132-caf7-4fdd-bfdc-4b4da7d01d1e', '309093002659', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0c2b98dc-e957-414b-a69d-112b3cb9c040', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309042900264@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0c2b98dc-e957-414b-a69d-112b3cb9c040', '309042900264@alrefaa.edu', 'خالد اسعد ابراهيم خدرج', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0c2b98dc-e957-414b-a69d-112b3cb9c040', '309042900264', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ff891934-9ba2-48e9-a95c-c3b3de8fb6c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080500085@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ff891934-9ba2-48e9-a95c-c3b3de8fb6c3', '309080500085@alrefaa.edu', 'سعود عبدالكريم سعود الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ff891934-9ba2-48e9-a95c-c3b3de8fb6c3', '309080500085', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('587c7e44-9823-4c20-b30f-8b6958bb8936', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310011200415@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('587c7e44-9823-4c20-b30f-8b6958bb8936', '310011200415@alrefaa.edu', 'عبدالرحمن بلال عبدالكريم عبدالهادى ابوسريه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('587c7e44-9823-4c20-b30f-8b6958bb8936', '310011200415', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1c182d0f-a622-41e6-912f-9e4b2bd603ed', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072901081@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1c182d0f-a622-41e6-912f-9e4b2bd603ed', '309072901081@alrefaa.edu', 'عبدالرحمن شاكر سليمان شاكر الدسوقى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1c182d0f-a622-41e6-912f-9e4b2bd603ed', '309072901081', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('99b9c854-9b2e-480d-8e9d-457ee5962125', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309091601017@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('99b9c854-9b2e-480d-8e9d-457ee5962125', '309091601017@alrefaa.edu', 'عبدالعزيز احمد عبدالله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('99b9c854-9b2e-480d-8e9d-457ee5962125', '309091601017', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2b6031a3-c16a-4c28-b831-50d78e514820', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309111101678@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2b6031a3-c16a-4c28-b831-50d78e514820', '309111101678@alrefaa.edu', 'عبدالهادى صلاح احمد البصيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2b6031a3-c16a-4c28-b831-50d78e514820', '309111101678', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('05caee78-ca93-4a75-8aef-57b758a7587a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032802185@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('05caee78-ca93-4a75-8aef-57b758a7587a', '309032802185@alrefaa.edu', 'عمر احمد الجيوشى حجازى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('05caee78-ca93-4a75-8aef-57b758a7587a', '309032802185', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0454a51d-1c4e-498c-823d-d805b0c88d62', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309042002536@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0454a51d-1c4e-498c-823d-d805b0c88d62', '309042002536@alrefaa.edu', 'عمر محمد صبر عواد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0454a51d-1c4e-498c-823d-d805b0c88d62', '309042002536', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1797f71d-6a6c-4013-9589-ec77a677ba03', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082401996@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1797f71d-6a6c-4013-9589-ec77a677ba03', '309082401996@alrefaa.edu', 'عمر محمد محمد سامح بدران', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1797f71d-6a6c-4013-9589-ec77a677ba03', '309082401996', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b24cfe05-adfb-4a65-8814-9fbbb4a13e78', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072702349@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b24cfe05-adfb-4a65-8814-9fbbb4a13e78', '309072702349@alrefaa.edu', 'عمر محمود ابراهيم ابراهيم محمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b24cfe05-adfb-4a65-8814-9fbbb4a13e78', '309072702349', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4bc44421-4721-4ba0-9fb1-7fdd104ed5dc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309050302555@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4bc44421-4721-4ba0-9fb1-7fdd104ed5dc', '309050302555@alrefaa.edu', 'عمرو احمد شوقي عامر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4bc44421-4721-4ba0-9fb1-7fdd104ed5dc', '309050302555', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('924e09c0-57c9-472e-a425-cf0748c81690', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309100300129@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('924e09c0-57c9-472e-a425-cf0748c81690', '309100300129@alrefaa.edu', 'محمد حمود مطير الرفيعي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('924e09c0-57c9-472e-a425-cf0748c81690', '309100300129', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('97c881e7-92b3-49f0-814c-b877b7a2994a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309041900473@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('97c881e7-92b3-49f0-814c-b877b7a2994a', '309041900473@alrefaa.edu', 'محمد الفاتح محمد ابراهيم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('97c881e7-92b3-49f0-814c-b877b7a2994a', '309041900473', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f24d749d-21c7-4143-8124-1d5da8c98afe', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309111301215@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f24d749d-21c7-4143-8124-1d5da8c98afe', '309111301215@alrefaa.edu', 'محمد ياسر عبدالمنعم محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f24d749d-21c7-4143-8124-1d5da8c98afe', '309111301215', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('690d55a0-af30-4789-8e73-8d8475bf3135', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310031402372@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('690d55a0-af30-4789-8e73-8d8475bf3135', '310031402372@alrefaa.edu', 'محمدعدنان تيسير عوض', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('690d55a0-af30-4789-8e73-8d8475bf3135', '310031402372', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('438b6087-40f7-4ef1-ad7a-ef95ce8c09eb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309100701088@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('438b6087-40f7-4ef1-ad7a-ef95ce8c09eb', '309100701088@alrefaa.edu', 'معاذ ايمن عبدالحكيم عبدالعزيز', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('438b6087-40f7-4ef1-ad7a-ef95ce8c09eb', '309100701088', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('eafa733c-76a5-4083-85c9-bc5ad92d7c82', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309070402043@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('eafa733c-76a5-4083-85c9-bc5ad92d7c82', '309070402043@alrefaa.edu', 'موسى رافع مطر بدر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('eafa733c-76a5-4083-85c9-bc5ad92d7c82', '309070402043', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a8dbc7db-2765-41b8-ad6b-9b6607f8348c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309011300573@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a8dbc7db-2765-41b8-ad6b-9b6607f8348c', '309011300573@alrefaa.edu', 'ناصر خلف المحيميد الخلف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a8dbc7db-2765-41b8-ad6b-9b6607f8348c', '309011300573', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fdb7e50c-8a49-40d8-a05d-c116e577d7c7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112502823@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fdb7e50c-8a49-40d8-a05d-c116e577d7c7', '308112502823@alrefaa.edu', 'ياسين احمد عبده محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fdb7e50c-8a49-40d8-a05d-c116e577d7c7', '308112502823', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7babccf0-e388-4196-8058-5961771ca440', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032600284@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7babccf0-e388-4196-8058-5961771ca440', '309032600284@alrefaa.edu', 'يوسف احمد محمود صالح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7babccf0-e388-4196-8058-5961771ca440', '309032600284', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0b911db7-78f5-4ba9-b409-595d48a52f44', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309052100076@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0b911db7-78f5-4ba9-b409-595d48a52f44', '309052100076@alrefaa.edu', 'يوسف هيثم سعيد نورالدين', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0b911db7-78f5-4ba9-b409-595d48a52f44', '309052100076', '18badcb5-7a3d-49ea-bcfa-2043ffce3db1');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5cbf1660-4703-4091-b2b8-ec38b3cd7665', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120102808@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5cbf1660-4703-4091-b2b8-ec38b3cd7665', '309120102808@alrefaa.edu', 'ابراهيم محمد سعد مطشر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5cbf1660-4703-4091-b2b8-ec38b3cd7665', '309120102808', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('81183a9f-4db1-4345-867f-79e152757256', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309122902091@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('81183a9f-4db1-4345-867f-79e152757256', '309122902091@alrefaa.edu', 'ابراهيم منصور غالي رحيم فجر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('81183a9f-4db1-4345-867f-79e152757256', '309122902091', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2436c48e-75b1-4a98-ad8d-eabef7a3925e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309052601874@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2436c48e-75b1-4a98-ad8d-eabef7a3925e', '309052601874@alrefaa.edu', 'جابر سعود جابر سنان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2436c48e-75b1-4a98-ad8d-eabef7a3925e', '309052601874', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ac55d959-37bb-4d90-bdc1-a8101a28de7d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310020601915@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ac55d959-37bb-4d90-bdc1-a8101a28de7d', '310020601915@alrefaa.edu', 'جاسم مشارى قاسم صابط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ac55d959-37bb-4d90-bdc1-a8101a28de7d', '310020601915', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('64af61ba-84c8-45b4-9389-1e8bd45a18a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309090102865@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('64af61ba-84c8-45b4-9389-1e8bd45a18a3', '309090102865@alrefaa.edu', 'حسين على شياع غانم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('64af61ba-84c8-45b4-9389-1e8bd45a18a3', '309090102865', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6b325326-e282-437d-8c4e-27c5213eaed1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310021102018@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6b325326-e282-437d-8c4e-27c5213eaed1', '310021102018@alrefaa.edu', 'خلف فهد خلف محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6b325326-e282-437d-8c4e-27c5213eaed1', '310021102018', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f51a5a1a-1cbd-4cb3-9b90-99f70c674756', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307070202173@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f51a5a1a-1cbd-4cb3-9b90-99f70c674756', '307070202173@alrefaa.edu', 'سالم ناصر حمود العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f51a5a1a-1cbd-4cb3-9b90-99f70c674756', '307070202173', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3d7ae924-aed0-4434-9f22-d439a6ad1c87', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309061300635@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3d7ae924-aed0-4434-9f22-d439a6ad1c87', '309061300635@alrefaa.edu', 'سلمان خالد هني الرشيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3d7ae924-aed0-4434-9f22-d439a6ad1c87', '309061300635', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1141d045-3d31-412f-933c-17a4b5e369d3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '913882300040@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1141d045-3d31-412f-933c-17a4b5e369d3', '913882300040@alrefaa.edu', 'طلال عدنان شمخي حزام', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1141d045-3d31-412f-933c-17a4b5e369d3', '913882300040', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2d0f2448-7fba-40ec-88f8-4cf2ec4bcd63', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309111902192@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2d0f2448-7fba-40ec-88f8-4cf2ec4bcd63', '309111902192@alrefaa.edu', 'طلال فهد زاحم مدلل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2d0f2448-7fba-40ec-88f8-4cf2ec4bcd63', '309111902192', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7fb15b74-da67-4e6f-8a5d-c2a04c35c49c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121601633@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7fb15b74-da67-4e6f-8a5d-c2a04c35c49c', '309121601633@alrefaa.edu', 'عبد الرحمن جلود المحمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7fb15b74-da67-4e6f-8a5d-c2a04c35c49c', '309121601633', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('671fe9d6-a293-4737-af94-8f9c7fdfae5d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121601641@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('671fe9d6-a293-4737-af94-8f9c7fdfae5d', '309121601641@alrefaa.edu', 'عبد العزيز جلود المحمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('671fe9d6-a293-4737-af94-8f9c7fdfae5d', '309121601641', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('43148270-249e-4f58-8738-207e36418693', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010700047@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('43148270-249e-4f58-8738-207e36418693', '310010700047@alrefaa.edu', 'عبدالرحمن عبدالله عبيد العازمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('43148270-249e-4f58-8738-207e36418693', '310010700047', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('445cd2c8-0cd4-446c-a41f-fba38be42026', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010200771@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('445cd2c8-0cd4-446c-a41f-fba38be42026', '310010200771@alrefaa.edu', 'عبدالعزيز عبدالوهاب حجي ساير رحيل العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('445cd2c8-0cd4-446c-a41f-fba38be42026', '310010200771', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('436a8734-1f05-4219-be7c-9282f971ee1c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082400037@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('436a8734-1f05-4219-be7c-9282f971ee1c', '309082400037@alrefaa.edu', 'فارس منصور فارس العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('436a8734-1f05-4219-be7c-9282f971ee1c', '309082400037', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('db359aff-78c5-488b-b3e5-9341dea16341', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032502115@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('db359aff-78c5-488b-b3e5-9341dea16341', '309032502115@alrefaa.edu', 'قاسم مشارى قاسم صابط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('db359aff-78c5-488b-b3e5-9341dea16341', '309032502115', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7999fb57-2dbb-4f3d-b2bf-1e722c7a3bcd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080901268@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7999fb57-2dbb-4f3d-b2bf-1e722c7a3bcd', '309080901268@alrefaa.edu', 'مشعل خالد مشعل الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7999fb57-2dbb-4f3d-b2bf-1e722c7a3bcd', '309080901268', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('84aa3a62-45c4-43e2-8799-9b2358550582', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010901842@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('84aa3a62-45c4-43e2-8799-9b2358550582', '310010901842@alrefaa.edu', 'مهدي صالح ناهى صالح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('84aa3a62-45c4-43e2-8799-9b2358550582', '310010901842', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('516e2ee1-107b-4de9-94a4-27d0133d6cf5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310011302251@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('516e2ee1-107b-4de9-94a4-27d0133d6cf5', '310011302251@alrefaa.edu', 'نايف سعد فرحان عايد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('516e2ee1-107b-4de9-94a4-27d0133d6cf5', '310011302251', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8aad9794-c23f-4a44-bcaa-20f6f5fabfa3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307120502546@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8aad9794-c23f-4a44-bcaa-20f6f5fabfa3', '307120502546@alrefaa.edu', 'نايف عجيل رويس قنديل نايف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8aad9794-c23f-4a44-bcaa-20f6f5fabfa3', '307120502546', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7cc0bdcf-9abb-4c21-8f8b-bc0fc1de3997', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072702146@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7cc0bdcf-9abb-4c21-8f8b-bc0fc1de3997', '309072702146@alrefaa.edu', 'يعقوب صالح عواد فرحان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7cc0bdcf-9abb-4c21-8f8b-bc0fc1de3997', '309072702146', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e1eb6fac-0036-4eb8-8357-2ae10b44b53b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309112500144@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e1eb6fac-0036-4eb8-8357-2ae10b44b53b', '309112500144@alrefaa.edu', 'يعقوب يوسف رهيف الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e1eb6fac-0036-4eb8-8357-2ae10b44b53b', '309112500144', 'f303760c-0e82-4d8a-a842-e4b39e953bc8');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('af227925-8b83-475e-ad93-b55edf7d1189', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310030200066@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('af227925-8b83-475e-ad93-b55edf7d1189', '310030200066@alrefaa.edu', 'احمد جمال عباس العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('af227925-8b83-475e-ad93-b55edf7d1189', '310030200066', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3559122c-b49d-4301-9bfb-94825d9622b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082002434@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3559122c-b49d-4301-9bfb-94825d9622b2', '309082002434@alrefaa.edu', 'خالد عبد الله مناحى ماضى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3559122c-b49d-4301-9bfb-94825d9622b2', '309082002434', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ef0285eb-0c7c-4dbb-b19e-889696949425', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310012300303@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ef0285eb-0c7c-4dbb-b19e-889696949425', '310012300303@alrefaa.edu', 'سعد عابد عبيد الرشيدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ef0285eb-0c7c-4dbb-b19e-889696949425', '310012300303', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('971f4070-6699-4a28-a4ce-8c0fb189b9ce', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309050501183@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('971f4070-6699-4a28-a4ce-8c0fb189b9ce', '309050501183@alrefaa.edu', 'سلطان سعود عاني الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('971f4070-6699-4a28-a4ce-8c0fb189b9ce', '309050501183', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('107e0259-835c-4be4-9caf-03358ca3f0cd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121000176@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('107e0259-835c-4be4-9caf-03358ca3f0cd', '309121000176@alrefaa.edu', 'صالح علي صالح فرحان خلف الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('107e0259-835c-4be4-9caf-03358ca3f0cd', '309121000176', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b937de35-61e3-458e-bc85-50f40f09371f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309071100223@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b937de35-61e3-458e-bc85-50f40f09371f', '309071100223@alrefaa.edu', 'طلال فيحان عبدالله الحسيني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b937de35-61e3-458e-bc85-50f40f09371f', '309071100223', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5a9ffe08-3f28-42f6-979d-fa7262772721', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309070301787@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5a9ffe08-3f28-42f6-979d-fa7262772721', '309070301787@alrefaa.edu', 'عباس حامد فيصل جنديل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5a9ffe08-3f28-42f6-979d-fa7262772721', '309070301787', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('10214f44-97f0-4ac0-958c-d3bbe2d9da83', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309051802375@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('10214f44-97f0-4ac0-958c-d3bbe2d9da83', '309051802375@alrefaa.edu', 'عبدالرحمن ابراهيم بسيوني ابراهيم هنداوي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('10214f44-97f0-4ac0-958c-d3bbe2d9da83', '309051802375', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6e410ef9-b1ae-42e2-b8ce-6fde8a40594d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072500739@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6e410ef9-b1ae-42e2-b8ce-6fde8a40594d', '309072500739@alrefaa.edu', 'عبدالله فواز عثمان بن عون', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6e410ef9-b1ae-42e2-b8ce-6fde8a40594d', '309072500739', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('263bc3c0-66e4-49e3-8dd1-b6f6774f11bf', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309100802428@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('263bc3c0-66e4-49e3-8dd1-b6f6774f11bf', '309100802428@alrefaa.edu', 'عبدالله مبارك مناحى نعمه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('263bc3c0-66e4-49e3-8dd1-b6f6774f11bf', '309100802428', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('07db3a2e-5a6b-4dd9-9ea3-46a9267fb91e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309050700991@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('07db3a2e-5a6b-4dd9-9ea3-46a9267fb91e', '309050700991@alrefaa.edu', 'عبدالهادى على دحيلان الحربى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('07db3a2e-5a6b-4dd9-9ea3-46a9267fb91e', '309050700991', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('baf4c9f0-944a-4959-957d-718bf6a31fb9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309032501526@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('baf4c9f0-944a-4959-957d-718bf6a31fb9', '309032501526@alrefaa.edu', 'علي حسين موسى الموسى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('baf4c9f0-944a-4959-957d-718bf6a31fb9', '309032501526', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1fa5d0de-780b-450d-b799-5f43a62eeed4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080701864@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1fa5d0de-780b-450d-b799-5f43a62eeed4', '309080701864@alrefaa.edu', 'علي فالح على ناصر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1fa5d0de-780b-450d-b799-5f43a62eeed4', '309080701864', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e867a108-80c0-4acc-968e-21dcc38ceee4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310030800109@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e867a108-80c0-4acc-968e-21dcc38ceee4', '310030800109@alrefaa.edu', 'فارس فايز سويدان العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e867a108-80c0-4acc-968e-21dcc38ceee4', '310030800109', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('18d80fe8-cfe2-4ce4-ab3d-3b516c7917ff', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010900874@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('18d80fe8-cfe2-4ce4-ab3d-3b516c7917ff', '310010900874@alrefaa.edu', 'فهد محمد فهد فردوس العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('18d80fe8-cfe2-4ce4-ab3d-3b516c7917ff', '310010900874', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('80ec9366-a9d8-4eaa-8367-2d17677f0e35', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121202085@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('80ec9366-a9d8-4eaa-8367-2d17677f0e35', '309121202085@alrefaa.edu', 'فهد مشعل قاسم صابط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('80ec9366-a9d8-4eaa-8367-2d17677f0e35', '309121202085', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b129f820-99b3-45f5-b0d2-9039aef832c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308100400416@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b129f820-99b3-45f5-b0d2-9039aef832c1', '308100400416@alrefaa.edu', 'فيصل عيسى ثواب المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b129f820-99b3-45f5-b0d2-9039aef832c1', '308100400416', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f75c3397-e583-4853-8e74-d283b2b8376f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080900898@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f75c3397-e583-4853-8e74-d283b2b8376f', '309080900898@alrefaa.edu', 'محمد عبد الله حرير الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f75c3397-e583-4853-8e74-d283b2b8376f', '309080900898', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('18ca524f-d496-4810-b7d1-62a039e0b163', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309081301707@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('18ca524f-d496-4810-b7d1-62a039e0b163', '309081301707@alrefaa.edu', 'محمد فايز عيدان شريف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('18ca524f-d496-4810-b7d1-62a039e0b163', '309081301707', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2a0f8056-912f-4162-a879-63ea3abcdfca', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309080101236@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2a0f8056-912f-4162-a879-63ea3abcdfca', '309080101236@alrefaa.edu', 'محمد لطيف فالح عبد الوهاب', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2a0f8056-912f-4162-a879-63ea3abcdfca', '309080101236', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2484bc46-243e-4709-a294-feb5e7108519', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308082601969@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2484bc46-243e-4709-a294-feb5e7108519', '308082601969@alrefaa.edu', 'مناحي عبد الله مناحى ماضى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2484bc46-243e-4709-a294-feb5e7108519', '308082601969', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9cab9d8e-af9b-4f21-81ea-8fbb2a1cafa9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309070701094@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9cab9d8e-af9b-4f21-81ea-8fbb2a1cafa9', '309070701094@alrefaa.edu', 'نصوح نادر محمد هاشم العرعورى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9cab9d8e-af9b-4f21-81ea-8fbb2a1cafa9', '309070701094', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1aec08bd-c2d7-4712-8c1c-e6b784027f66', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310012802143@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1aec08bd-c2d7-4712-8c1c-e6b784027f66', '310012802143@alrefaa.edu', 'هادي ابراهيم هادي صعفق الخالدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1aec08bd-c2d7-4712-8c1c-e6b784027f66', '310012802143', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6962e1cf-0ad8-4d52-9e90-e8e853ef405f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309082000893@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6962e1cf-0ad8-4d52-9e90-e8e853ef405f', '309082000893@alrefaa.edu', 'هزاع خالد هلال الخالدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6962e1cf-0ad8-4d52-9e90-e8e853ef405f', '309082000893', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c914c25b-34df-4fdb-8fa5-44c6d0a07bfe', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310012102235@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c914c25b-34df-4fdb-8fa5-44c6d0a07bfe', '310012102235@alrefaa.edu', 'وليد خالد عطيه فالح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c914c25b-34df-4fdb-8fa5-44c6d0a07bfe', '310012102235', 'f8595ff6-f4dd-4627-9d64-215cca7a41b5');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6aa73bfb-84ef-4236-9cc8-08aab92e1971', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110700505@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6aa73bfb-84ef-4236-9cc8-08aab92e1971', '309110700505@alrefaa.edu', 'براك زيد زعال الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6aa73bfb-84ef-4236-9cc8-08aab92e1971', '309110700505', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a1ba59b2-17ff-4b91-bbc4-0491902a0739', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310021101648@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a1ba59b2-17ff-4b91-bbc4-0491902a0739', '310021101648@alrefaa.edu', 'حمزة هاشم غاطى الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a1ba59b2-17ff-4b91-bbc4-0491902a0739', '310021101648', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d177139d-ed05-406e-b0f8-9371f1d02ada', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310020400742@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d177139d-ed05-406e-b0f8-9371f1d02ada', '310020400742@alrefaa.edu', 'سعود جميعان نهار المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d177139d-ed05-406e-b0f8-9371f1d02ada', '310020400742', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f9a43c29-13cf-4710-b63c-07b7824a9b97', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310010801681@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f9a43c29-13cf-4710-b63c-07b7824a9b97', '310010801681@alrefaa.edu', 'سلطان حمود هادي كريدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f9a43c29-13cf-4710-b63c-07b7824a9b97', '310010801681', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('998a5ad6-6a9c-4080-b89e-019854b58ef9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309121000096@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('998a5ad6-6a9c-4080-b89e-019854b58ef9', '309121000096@alrefaa.edu', 'سلطان محمد مطلق فريح المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('998a5ad6-6a9c-4080-b89e-019854b58ef9', '309121000096', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('89d6f667-611e-4f8d-9430-1f9d3b530c15', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309081100075@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('89d6f667-611e-4f8d-9430-1f9d3b530c15', '309081100075@alrefaa.edu', 'طلال محمد حسين براك العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('89d6f667-611e-4f8d-9430-1f9d3b530c15', '309081100075', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c5055f57-ebf7-43aa-a37a-2371723c83ad', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309031602034@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c5055f57-ebf7-43aa-a37a-2371723c83ad', '309031602034@alrefaa.edu', 'عبدالعزيز صباح مطشر محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c5055f57-ebf7-43aa-a37a-2371723c83ad', '309031602034', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a43e1477-bfc2-4af4-b0d9-c4e7443ef669', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310013101891@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a43e1477-bfc2-4af4-b0d9-c4e7443ef669', '310013101891@alrefaa.edu', 'عبدالله محمد عواد على', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a43e1477-bfc2-4af4-b0d9-c4e7443ef669', '310013101891', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fff17ebd-a494-4ba4-889f-70b3beaf232f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308091301802@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fff17ebd-a494-4ba4-889f-70b3beaf232f', '308091301802@alrefaa.edu', 'علي حمد يوسف خزعل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fff17ebd-a494-4ba4-889f-70b3beaf232f', '308091301802', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0ada102a-da1c-4120-9c95-d3f844809ad5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110402401@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0ada102a-da1c-4120-9c95-d3f844809ad5', '309110402401@alrefaa.edu', 'عمر حسن منصور مانع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0ada102a-da1c-4120-9c95-d3f844809ad5', '309110402401', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('65a20272-f2df-4861-88f8-4b8f6c9219e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309031800575@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('65a20272-f2df-4861-88f8-4b8f6c9219e2', '309031800575@alrefaa.edu', 'عمر حمدان سويدان العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('65a20272-f2df-4861-88f8-4b8f6c9219e2', '309031800575', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('29f06460-3b4d-4642-8d5a-367dfdcd1dd2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309072101033@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('29f06460-3b4d-4642-8d5a-367dfdcd1dd2', '309072101033@alrefaa.edu', 'عمر خالد حسن العمر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('29f06460-3b4d-4642-8d5a-367dfdcd1dd2', '309072101033', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2418958c-9187-45a2-bbf5-f27c27037ad6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309021800133@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2418958c-9187-45a2-bbf5-f27c27037ad6', '309021800133@alrefaa.edu', 'عيسى حبش العكله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2418958c-9187-45a2-bbf5-f27c27037ad6', '309021800133', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('075d2bcc-1c30-41c7-bb64-f29e0a0baaa8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120100167@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('075d2bcc-1c30-41c7-bb64-f29e0a0baaa8', '309120100167@alrefaa.edu', 'فلاح متعب بداح اللصقه العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('075d2bcc-1c30-41c7-bb64-f29e0a0baaa8', '309120100167', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('513587c2-ee33-4361-881a-5be5b076ea95', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309031600223@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('513587c2-ee33-4361-881a-5be5b076ea95', '309031600223@alrefaa.edu', 'مبارك عبدالله خليفه المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('513587c2-ee33-4361-881a-5be5b076ea95', '309031600223', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6311a2ea-960f-4a67-8d35-169df59ee3c8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309083000764@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6311a2ea-960f-4a67-8d35-169df59ee3c8', '309083000764@alrefaa.edu', 'محمد بدر صالح العدوانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6311a2ea-960f-4a67-8d35-169df59ee3c8', '309083000764', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('09c29dc4-8b4a-4995-9c7b-a8c96a90d8ee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120802329@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('09c29dc4-8b4a-4995-9c7b-a8c96a90d8ee', '309120802329@alrefaa.edu', 'محمد سعد عوده فيحان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('09c29dc4-8b4a-4995-9c7b-a8c96a90d8ee', '309120802329', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7d071bc6-90a1-4a16-b778-dd9788e5e865', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309110701671@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7d071bc6-90a1-4a16-b778-dd9788e5e865', '309110701671@alrefaa.edu', 'محمد سلمان غاطى خلاوى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7d071bc6-90a1-4a16-b778-dd9788e5e865', '309110701671', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('dbe79bc2-5951-4b8a-8877-fc43fdd0e7e6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309120502078@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('dbe79bc2-5951-4b8a-8877-fc43fdd0e7e6', '309120502078@alrefaa.edu', 'محمد فواز هادي كريدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('dbe79bc2-5951-4b8a-8877-fc43fdd0e7e6', '309120502078', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fc7fff6f-8476-4e4d-ae29-5e19a4fd033f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309043002052@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fc7fff6f-8476-4e4d-ae29-5e19a4fd033f', '309043002052@alrefaa.edu', 'مشعل مرزوق على عبد الله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fc7fff6f-8476-4e4d-ae29-5e19a4fd033f', '309043002052', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bad62375-6853-49b9-8611-3506ccce91d8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '310020400734@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bad62375-6853-49b9-8611-3506ccce91d8', '310020400734@alrefaa.edu', 'نهار جميعان نهار المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bad62375-6853-49b9-8611-3506ccce91d8', '310020400734', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7f340ac5-b7ed-418a-862c-353b4638e778', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '913882300038@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7f340ac5-b7ed-418a-862c-353b4638e778', '913882300038@alrefaa.edu', 'يوسف خالد ثاني ركيك ناصر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7f340ac5-b7ed-418a-862c-353b4638e778', '913882300038', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6c639e7f-e197-4fc0-a03b-bd43f7e875ce', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309102902596@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6c639e7f-e197-4fc0-a03b-bd43f7e875ce', '309102902596@alrefaa.edu', 'يوسف سعد صاهود الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6c639e7f-e197-4fc0-a03b-bd43f7e875ce', '309102902596', '6dcdc87d-f523-42c6-83f9-ead0413d5722');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ba33f845-eaac-4fdc-a8ed-30e84989c684', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308092202777@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ba33f845-eaac-4fdc-a8ed-30e84989c684', '308092202777@alrefaa.edu', 'ابراهيم خميس سعيد الشمرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ba33f845-eaac-4fdc-a8ed-30e84989c684', '308092202777', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0db37888-d842-4848-ba50-63d1a75ec5e0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309011802493@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0db37888-d842-4848-ba50-63d1a75ec5e0', '309011802493@alrefaa.edu', 'باسل سعود فضل مقطوف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0db37888-d842-4848-ba50-63d1a75ec5e0', '309011802493', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e9af9788-470f-406e-94ca-1af54f144eca', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308100301864@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e9af9788-470f-406e-94ca-1af54f144eca', '308100301864@alrefaa.edu', 'خالد احمد عطيه بطى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e9af9788-470f-406e-94ca-1af54f144eca', '308100301864', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('500ded96-2b2b-417a-9ffb-0f4c484d039e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308092900591@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('500ded96-2b2b-417a-9ffb-0f4c484d039e', '308092900591@alrefaa.edu', 'خالد فهد شبيب المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('500ded96-2b2b-417a-9ffb-0f4c484d039e', '308092900591', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('be7cb022-1c8d-4277-a86e-d85d4211a0d8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051300637@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('be7cb022-1c8d-4277-a86e-d85d4211a0d8', '308051300637@alrefaa.edu', 'خليفه ثامر خليفه العازمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('be7cb022-1c8d-4277-a86e-d85d4211a0d8', '308051300637', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('37dbe0ad-b24b-4e07-a410-51ad3d5a0781', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308041000198@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('37dbe0ad-b24b-4e07-a410-51ad3d5a0781', '308041000198@alrefaa.edu', 'صالح فيصل صالح الهده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('37dbe0ad-b24b-4e07-a410-51ad3d5a0781', '308041000198', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7b10036f-c0a2-483c-a982-5a0e2bc652ea', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309030401732@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7b10036f-c0a2-483c-a982-5a0e2bc652ea', '309030401732@alrefaa.edu', 'طارق زياد العبدالله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7b10036f-c0a2-483c-a982-5a0e2bc652ea', '309030401732', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4e87214e-966d-4637-968e-dc9a453b9ade', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062401927@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4e87214e-966d-4637-968e-dc9a453b9ade', '308062401927@alrefaa.edu', 'طارق نمر حسين الشيحان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4e87214e-966d-4637-968e-dc9a453b9ade', '308062401927', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('76ac4d95-5e53-4a2b-9ce3-1d9093a36842', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308050700655@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('76ac4d95-5e53-4a2b-9ce3-1d9093a36842', '308050700655@alrefaa.edu', 'عبدالرحمن محمد عبدالعزيز الفنار', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('76ac4d95-5e53-4a2b-9ce3-1d9093a36842', '308050700655', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b145b824-fd98-44ee-8130-682fdf7576ca', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308121901834@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b145b824-fd98-44ee-8130-682fdf7576ca', '308121901834@alrefaa.edu', 'عبدالعزيز مشعل قاسم صابط', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b145b824-fd98-44ee-8130-682fdf7576ca', '308121901834', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7d0cb611-c8fe-4270-b8c1-5aacc7e93f97', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051800367@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7d0cb611-c8fe-4270-b8c1-5aacc7e93f97', '308051800367@alrefaa.edu', 'عبدالله صطام مرزوق العتيبي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7d0cb611-c8fe-4270-b8c1-5aacc7e93f97', '308051800367', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f725ad58-21d4-463b-be4f-420c69483f35', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051500145@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f725ad58-21d4-463b-be4f-420c69483f35', '308051500145@alrefaa.edu', 'عمر احمد عيد الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f725ad58-21d4-463b-be4f-420c69483f35', '308051500145', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('643f6851-8d38-4fbc-9fc2-bf42f1b45b11', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112601952@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('643f6851-8d38-4fbc-9fc2-bf42f1b45b11', '308112601952@alrefaa.edu', 'فهد عبداللطيف لطوف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('643f6851-8d38-4fbc-9fc2-bf42f1b45b11', '308112601952', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4f23a82b-d3cb-4a17-9484-4f7980388116', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308072600292@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4f23a82b-d3cb-4a17-9484-4f7980388116', '308072600292@alrefaa.edu', 'فهد مبارك عايد سالم غانم الصليلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4f23a82b-d3cb-4a17-9484-4f7980388116', '308072600292', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('686122f8-84b5-4251-bb22-9e7bb36ad0d8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309030102679@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('686122f8-84b5-4251-bb22-9e7bb36ad0d8', '309030102679@alrefaa.edu', 'فيصل جابر فارس ساكت', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('686122f8-84b5-4251-bb22-9e7bb36ad0d8', '309030102679', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('70d2837d-8c57-476b-b303-109fa4e3e220', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308070400633@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('70d2837d-8c57-476b-b303-109fa4e3e220', '308070400633@alrefaa.edu', 'محمد اسامه عبدالحميد رجب', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('70d2837d-8c57-476b-b303-109fa4e3e220', '308070400633', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2c294ce6-c733-4a36-8959-6de48a051deb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308102000344@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2c294ce6-c733-4a36-8959-6de48a051deb', '308102000344@alrefaa.edu', 'محمد عمرو محمد رمضان محروس', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2c294ce6-c733-4a36-8959-6de48a051deb', '308102000344', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bb579b6c-8767-4ce6-887f-088fa86c04f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308070800469@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bb579b6c-8767-4ce6-887f-088fa86c04f2', '308070800469@alrefaa.edu', 'موسى علي فواز الابراهيم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bb579b6c-8767-4ce6-887f-088fa86c04f2', '308070800469', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('07835e05-dfd9-4b38-8bec-2f04000594b6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309013100532@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('07835e05-dfd9-4b38-8bec-2f04000594b6', '309013100532@alrefaa.edu', 'ناصر خالد ناصر الزكري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('07835e05-dfd9-4b38-8bec-2f04000594b6', '309013100532', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0abf58e9-c42b-488e-bf81-dd8630e71379', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307123000605@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0abf58e9-c42b-488e-bf81-dd8630e71379', '307123000605@alrefaa.edu', 'يعقوب حبش العكله', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0abf58e9-c42b-488e-bf81-dd8630e71379', '307123000605', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3cd9c42d-ed3b-436d-8c0c-cec90b8aaa1c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062900945@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3cd9c42d-ed3b-436d-8c0c-cec90b8aaa1c', '308062900945@alrefaa.edu', 'يوسف احمد محمد عبدالحفيظ محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3cd9c42d-ed3b-436d-8c0c-cec90b8aaa1c', '308062900945', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4ffd3178-42bb-47dd-8b5f-0728f7378c5c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308031901726@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4ffd3178-42bb-47dd-8b5f-0728f7378c5c', '308031901726@alrefaa.edu', 'يوسف لافي خلف البرازي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4ffd3178-42bb-47dd-8b5f-0728f7378c5c', '308031901726', 'f81df024-7c06-4b35-9e81-9c9224d427d0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1004b5fe-efb5-49a8-acd8-e03df40e8a6c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308092201504@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1004b5fe-efb5-49a8-acd8-e03df40e8a6c', '308092201504@alrefaa.edu', 'أحمد فهمى عبدالمنعم عبده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1004b5fe-efb5-49a8-acd8-e03df40e8a6c', '308092201504', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('746be2d9-c02d-4b0e-bb63-fe7a170689d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308090801522@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('746be2d9-c02d-4b0e-bb63-fe7a170689d4', '308090801522@alrefaa.edu', 'أحمد محمد أحمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('746be2d9-c02d-4b0e-bb63-fe7a170689d4', '308090801522', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3d8f5cc4-e777-4519-8cbb-5777bb4db14a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032101448@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3d8f5cc4-e777-4519-8cbb-5777bb4db14a', '308032101448@alrefaa.edu', 'بجاد عوده محمد العدوانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3d8f5cc4-e777-4519-8cbb-5777bb4db14a', '308032101448', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('97cb2141-f9ab-4c71-812b-e952f486a467', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308081502037@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('97cb2141-f9ab-4c71-812b-e952f486a467', '308081502037@alrefaa.edu', 'بشار على عبد الله حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('97cb2141-f9ab-4c71-812b-e952f486a467', '308081502037', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fbe070d5-278b-441b-a498-820d1fe11119', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309031300271@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fbe070d5-278b-441b-a498-820d1fe11119', '309031300271@alrefaa.edu', 'تركى صقر محمد الوسمى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fbe070d5-278b-441b-a498-820d1fe11119', '309031300271', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8949b9ca-9a70-4135-abc4-1ca08e689b2a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309010900585@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8949b9ca-9a70-4135-abc4-1ca08e689b2a', '309010900585@alrefaa.edu', 'خليفه محمد خليفه المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8949b9ca-9a70-4135-abc4-1ca08e689b2a', '309010900585', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8415b4b4-9b1a-4fb7-b566-55ecb61c021c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308070800442@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8415b4b4-9b1a-4fb7-b566-55ecb61c021c', '308070800442@alrefaa.edu', 'عبدالرحمن هارون عبدالعزيز مشرف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8415b4b4-9b1a-4fb7-b566-55ecb61c021c', '308070800442', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8247a86e-4f7a-4439-9b21-6db9dca79b56', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308101301137@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8247a86e-4f7a-4439-9b21-6db9dca79b56', '308101301137@alrefaa.edu', 'عبدالعزيز علي ناصر حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8247a86e-4f7a-4439-9b21-6db9dca79b56', '308101301137', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('98bae736-128d-4019-83ff-78602400ca46', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308040102483@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('98bae736-128d-4019-83ff-78602400ca46', '308040102483@alrefaa.edu', 'عبدالله النجرس', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('98bae736-128d-4019-83ff-78602400ca46', '308040102483', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7eb561bf-a3e8-4f30-9200-1bf9bf0bcf7b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308060601431@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7eb561bf-a3e8-4f30-9200-1bf9bf0bcf7b', '308060601431@alrefaa.edu', 'على طعمه دعبول ساير', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7eb561bf-a3e8-4f30-9200-1bf9bf0bcf7b', '308060601431', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6abe53b2-9592-4057-b4da-9a0875cd70fe', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308111200719@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6abe53b2-9592-4057-b4da-9a0875cd70fe', '308111200719@alrefaa.edu', 'علي خالد على شتراء', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6abe53b2-9592-4057-b4da-9a0875cd70fe', '308111200719', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3e739c6f-0ac6-49ff-a689-d585371339bd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112002175@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3e739c6f-0ac6-49ff-a689-d585371339bd', '308112002175@alrefaa.edu', 'علي خالد علي جروان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3e739c6f-0ac6-49ff-a689-d585371339bd', '308112002175', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e0dbd998-c286-4851-adbe-7a513c9d1283', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062201992@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e0dbd998-c286-4851-adbe-7a513c9d1283', '308062201992@alrefaa.edu', 'عمر محمد تفريح محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e0dbd998-c286-4851-adbe-7a513c9d1283', '308062201992', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1cd41899-250d-4082-b896-e84b3fcca789', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308061700095@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1cd41899-250d-4082-b896-e84b3fcca789', '308061700095@alrefaa.edu', 'عمرو علاء الدين سعد سيف سعد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1cd41899-250d-4082-b896-e84b3fcca789', '308061700095', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3bd35f7d-1c72-42d9-be7a-77cfe8cd4f86', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309030601726@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3bd35f7d-1c72-42d9-be7a-77cfe8cd4f86', '309030601726@alrefaa.edu', 'عمرو محمد خير ابوحوران', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3bd35f7d-1c72-42d9-be7a-77cfe8cd4f86', '309030601726', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4fe45bef-9175-446a-bdd6-a782d4fecb9f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307022501902@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4fe45bef-9175-446a-bdd6-a782d4fecb9f', '307022501902@alrefaa.edu', 'محمد رياض ضيف الله احمد قديح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4fe45bef-9175-446a-bdd6-a782d4fecb9f', '307022501902', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bd87c66f-e848-464f-aef5-05cc876f8e32', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307103101118@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bd87c66f-e848-464f-aef5-05cc876f8e32', '307103101118@alrefaa.edu', 'محمد شادي حسين السلامه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bd87c66f-e848-464f-aef5-05cc876f8e32', '307103101118', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4297ad01-f75a-491c-8dd8-64f3eefeaa40', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308102100337@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4297ad01-f75a-491c-8dd8-64f3eefeaa40', '308102100337@alrefaa.edu', 'محمد غيث امجد ماجد السعدى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4297ad01-f75a-491c-8dd8-64f3eefeaa40', '308102100337', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f062e11a-ae15-4ebe-a2ca-c6d1320bfd15', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308073000037@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f062e11a-ae15-4ebe-a2ca-c6d1320bfd15', '308073000037@alrefaa.edu', 'منصور سعود اجفين العازمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f062e11a-ae15-4ebe-a2ca-c6d1320bfd15', '308073000037', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ae12ac19-03a3-478b-b220-d8852075835b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309011801028@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ae12ac19-03a3-478b-b220-d8852075835b', '309011801028@alrefaa.edu', 'نايف وائل نايف تركي العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ae12ac19-03a3-478b-b220-d8852075835b', '309011801028', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5d466e1d-8095-4d66-8f88-756b9a6e0634', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308053000451@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5d466e1d-8095-4d66-8f88-756b9a6e0634', '308053000451@alrefaa.edu', 'نوح أحمد ناجح علي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5d466e1d-8095-4d66-8f88-756b9a6e0634', '308053000451', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('063162e2-5482-4aa7-98c3-550c7d3c4c81', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309020500315@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('063162e2-5482-4aa7-98c3-550c7d3c4c81', '309020500315@alrefaa.edu', 'يوسف محمد يوسف محمد يوسف حمامه', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('063162e2-5482-4aa7-98c3-550c7d3c4c81', '309020500315', '5e234fdc-f96a-4974-a0b5-bc3766a0c4f9');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fdbc3d15-7c31-42fd-88a6-d0ef584749ce', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308102800317@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fdbc3d15-7c31-42fd-88a6-d0ef584749ce', '308102800317@alrefaa.edu', 'أمجد خالد عبد القادر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fdbc3d15-7c31-42fd-88a6-d0ef584749ce', '308102800317', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3b11561f-40c8-4941-87ba-75503a607016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308102902313@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3b11561f-40c8-4941-87ba-75503a607016', '308102902313@alrefaa.edu', 'حازم هيثم ناجح صادق علي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3b11561f-40c8-4941-87ba-75503a607016', '308102902313', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e052f665-ba61-4b1f-9d79-cf83813f18b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308041801614@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e052f665-ba61-4b1f-9d79-cf83813f18b9', '308041801614@alrefaa.edu', 'خالد رضا حامد حامدعلي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e052f665-ba61-4b1f-9d79-cf83813f18b9', '308041801614', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('05757424-e446-4c27-afa2-d444b002e8e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308052200013@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('05757424-e446-4c27-afa2-d444b002e8e5', '308052200013@alrefaa.edu', 'خالد مشعل جزاع السعيدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('05757424-e446-4c27-afa2-d444b002e8e5', '308052200013', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('966f157b-66a1-4518-90db-35e1ef067e7e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307121800537@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('966f157b-66a1-4518-90db-35e1ef067e7e', '307121800537@alrefaa.edu', 'خضير نواف خضير الصليلى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('966f157b-66a1-4518-90db-35e1ef067e7e', '307121800537', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b920d73b-6b04-4aba-a05c-6f784492e88a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308031800917@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b920d73b-6b04-4aba-a05c-6f784492e88a', '308031800917@alrefaa.edu', 'ساير باتل راضي الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b920d73b-6b04-4aba-a05c-6f784492e88a', '308031800917', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('f578890a-d087-4e51-bdda-a7b25167dbe8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308060800035@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('f578890a-d087-4e51-bdda-a7b25167dbe8', '308060800035@alrefaa.edu', 'سعود نواف لماس الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('f578890a-d087-4e51-bdda-a7b25167dbe8', '308060800035', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0e79d846-e0b2-4f5c-8321-1280fd4fd13e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051700104@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0e79d846-e0b2-4f5c-8321-1280fd4fd13e', '308051700104@alrefaa.edu', 'سليمان عبد الرحمن محمود محمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0e79d846-e0b2-4f5c-8321-1280fd4fd13e', '308051700104', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('46ca1f61-1094-46fe-9fb7-13fda4412aca', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308080803217@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('46ca1f61-1094-46fe-9fb7-13fda4412aca', '308080803217@alrefaa.edu', 'عباس تركى بهلول بادى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('46ca1f61-1094-46fe-9fb7-13fda4412aca', '308080803217', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('013f9111-b5e0-4899-a8ee-ad945d283ba0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308092102119@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('013f9111-b5e0-4899-a8ee-ad945d283ba0', '308092102119@alrefaa.edu', 'عبدالكريم احمد العيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('013f9111-b5e0-4899-a8ee-ad945d283ba0', '308092102119', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7064934a-8d12-4299-b6c9-590407953fe9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308102100417@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7064934a-8d12-4299-b6c9-590407953fe9', '308102100417@alrefaa.edu', 'عبدالله احمد مريح الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7064934a-8d12-4299-b6c9-590407953fe9', '308102100417', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3373a527-e3d9-43c2-aa44-8b2899cb0f90', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309021000523@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3373a527-e3d9-43c2-aa44-8b2899cb0f90', '309021000523@alrefaa.edu', 'عثمان رسول سرحان ذياب', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3373a527-e3d9-43c2-aa44-8b2899cb0f90', '309021000523', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d7f50e53-57e9-4d19-901b-cb8a87063d1a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307071802082@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d7f50e53-57e9-4d19-901b-cb8a87063d1a', '307071802082@alrefaa.edu', 'عذبي احمد عبد الله حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d7f50e53-57e9-4d19-901b-cb8a87063d1a', '307071802082', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8e34a903-49f7-43eb-9a90-b4b52f708f17', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308080803209@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8e34a903-49f7-43eb-9a90-b4b52f708f17', '308080803209@alrefaa.edu', 'علي تركى بهلول بادى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8e34a903-49f7-43eb-9a90-b4b52f708f17', '308080803209', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('606be066-5d63-4a01-9f23-43ca6c25d98c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308040400202@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('606be066-5d63-4a01-9f23-43ca6c25d98c', '308040400202@alrefaa.edu', 'فهد سعود حمود العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('606be066-5d63-4a01-9f23-43ca6c25d98c', '308040400202', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3ddf8a35-4d3b-43e8-a150-a5cb0f78108b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308080201777@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3ddf8a35-4d3b-43e8-a150-a5cb0f78108b', '308080201777@alrefaa.edu', 'فيلوباتير نجاح كمال توفيق', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3ddf8a35-4d3b-43e8-a150-a5cb0f78108b', '308080201777', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b1747c25-1d24-4738-b7c1-0e96215325a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308071100691@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b1747c25-1d24-4738-b7c1-0e96215325a3', '308071100691@alrefaa.edu', 'لافي سعود شنين', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b1747c25-1d24-4738-b7c1-0e96215325a3', '308071100691', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b0805f3a-1ee4-49d0-a42b-df9fc6903695', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308011400262@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b0805f3a-1ee4-49d0-a42b-df9fc6903695', '308011400262@alrefaa.edu', 'مالك جمال الدين حماد احمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b0805f3a-1ee4-49d0-a42b-df9fc6903695', '308011400262', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('5903960a-6568-4158-bd2f-ede533b0dcae', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308052500622@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('5903960a-6568-4158-bd2f-ede533b0dcae', '308052500622@alrefaa.edu', 'مجول على مجول المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('5903960a-6568-4158-bd2f-ede533b0dcae', '308052500622', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('60584ef3-227a-4319-9e17-4418bf5b7fe7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062600117@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('60584ef3-227a-4319-9e17-4418bf5b7fe7', '308062600117@alrefaa.edu', 'مرزوق محمد رشيد مطر رشيد الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('60584ef3-227a-4319-9e17-4418bf5b7fe7', '308062600117', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bd3ff428-f7ac-4dd5-ac3c-248073481fe0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307071002448@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bd3ff428-f7ac-4dd5-ac3c-248073481fe0', '307071002448@alrefaa.edu', 'مروان ممدوح فرجون حسن احمد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bd3ff428-f7ac-4dd5-ac3c-248073481fe0', '307071002448', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('40d7be26-1d87-451f-8010-6154339742a0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308072302228@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('40d7be26-1d87-451f-8010-6154339742a0', '308072302228@alrefaa.edu', 'مشاري فيصل خليل راشد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('40d7be26-1d87-451f-8010-6154339742a0', '308072302228', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0373737a-3ec9-44cc-b06d-ff67d0768760', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309010201012@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0373737a-3ec9-44cc-b06d-ff67d0768760', '309010201012@alrefaa.edu', 'يوسف خالد هلال حموده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0373737a-3ec9-44cc-b06d-ff67d0768760', '309010201012', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1761c3dc-e1bd-46c9-9a04-fa02b5e3459e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051401075@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1761c3dc-e1bd-46c9-9a04-fa02b5e3459e', '308051401075@alrefaa.edu', 'يوسف كمال معتوق', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1761c3dc-e1bd-46c9-9a04-fa02b5e3459e', '308051401075', '918cff34-3313-4459-b0d8-49776f8575c3');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('daaa84d1-491c-4a31-b81e-adc21560eef1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307091200388@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('daaa84d1-491c-4a31-b81e-adc21560eef1', '307091200388@alrefaa.edu', 'احمد مسعود غلام رسول', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('daaa84d1-491c-4a31-b81e-adc21560eef1', '307091200388', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c90eeb5e-842f-4b93-bd01-f384ae0bc4c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307112800105@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c90eeb5e-842f-4b93-bd01-f384ae0bc4c2', '307112800105@alrefaa.edu', 'بداح خالد عبدالله العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c90eeb5e-842f-4b93-bd01-f384ae0bc4c2', '307112800105', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('04130cf3-451c-486c-964f-fc742044551a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309021901807@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('04130cf3-451c-486c-964f-fc742044551a', '309021901807@alrefaa.edu', 'تركي زاهى شويهين جندل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('04130cf3-451c-486c-964f-fc742044551a', '309021901807', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0e74ae11-96e7-4b89-a227-83518488892e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112101894@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0e74ae11-96e7-4b89-a227-83518488892e', '308112101894@alrefaa.edu', 'جابر سعدون جابر مطر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0e74ae11-96e7-4b89-a227-83518488892e', '308112101894', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('80712a47-aae1-40ec-b586-42c132d824f7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308092202726@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('80712a47-aae1-40ec-b586-42c132d824f7', '308092202726@alrefaa.edu', 'حسين وليد خالد الدويده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('80712a47-aae1-40ec-b586-42c132d824f7', '308092202726', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9ca1739d-51d7-438c-b256-d95596f2f572', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062801648@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9ca1739d-51d7-438c-b256-d95596f2f572', '308062801648@alrefaa.edu', 'سلطان سعد ابراهيم النايف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9ca1739d-51d7-438c-b256-d95596f2f572', '308062801648', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ef1114b4-abb0-4938-bd5e-44dc1bc2b610', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308100500791@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ef1114b4-abb0-4938-bd5e-44dc1bc2b610', '308100500791@alrefaa.edu', 'سلمان سعدون جزاع الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ef1114b4-abb0-4938-bd5e-44dc1bc2b610', '308100500791', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a0f56b73-d435-41c5-8d15-2e9995050586', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308033001318@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a0f56b73-d435-41c5-8d15-2e9995050586', '308033001318@alrefaa.edu', 'ضارى ناصر عذاب الرمضان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a0f56b73-d435-41c5-8d15-2e9995050586', '308033001318', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4a3c2c3b-34c9-47a8-8d56-0c99bbb9b08e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112002431@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4a3c2c3b-34c9-47a8-8d56-0c99bbb9b08e', '308112002431@alrefaa.edu', 'طلال جابر عوده صبيح', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4a3c2c3b-34c9-47a8-8d56-0c99bbb9b08e', '308112002431', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e7575b7e-8daf-450c-844b-47f08cebeb44', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308101700138@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e7575b7e-8daf-450c-844b-47f08cebeb44', '308101700138@alrefaa.edu', 'عمر غازي فيصل العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e7575b7e-8daf-450c-844b-47f08cebeb44', '308101700138', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('9f66389a-bff1-4c30-b409-d6961de1b21e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308090601272@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('9f66389a-bff1-4c30-b409-d6961de1b21e', '308090601272@alrefaa.edu', 'عيسى عبدالرحمن عيسى السليم', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('9f66389a-bff1-4c30-b409-d6961de1b21e', '308090601272', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('81ddf942-6f4c-440e-9e52-7a5eb7b90524', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308112200075@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('81ddf942-6f4c-440e-9e52-7a5eb7b90524', '308112200075@alrefaa.edu', 'غازي عبدالله غازي العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('81ddf942-6f4c-440e-9e52-7a5eb7b90524', '308112200075', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bd08568f-9e34-4fc0-9a5e-47cbcc3d198f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308110801248@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bd08568f-9e34-4fc0-9a5e-47cbcc3d198f', '308110801248@alrefaa.edu', 'فيصل فرحان مرجي العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bd08568f-9e34-4fc0-9a5e-47cbcc3d198f', '308110801248', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('18b42916-9886-4e63-a323-d064330d22c6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308100900082@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('18b42916-9886-4e63-a323-d064330d22c6', '308100900082@alrefaa.edu', 'مبارك راشد محمد المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('18b42916-9886-4e63-a323-d064330d22c6', '308100900082', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ebbff68b-9446-4bcc-b86f-27d2b04ce016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309012800377@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ebbff68b-9446-4bcc-b86f-27d2b04ce016', '309012800377@alrefaa.edu', 'محمد جمال حبيب الضامر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ebbff68b-9446-4bcc-b86f-27d2b04ce016', '309012800377', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c0010ef3-86b3-4a0e-8ab3-afc28ffa41a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308120400077@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c0010ef3-86b3-4a0e-8ab3-afc28ffa41a6', '308120400077@alrefaa.edu', 'محمد غازي عبدالله العريفان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c0010ef3-86b3-4a0e-8ab3-afc28ffa41a6', '308120400077', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6a5d5fa9-2d38-436c-966a-b2100bdadf9b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051501519@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6a5d5fa9-2d38-436c-966a-b2100bdadf9b', '308051501519@alrefaa.edu', 'محمد مسلط عيد الهرشانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6a5d5fa9-2d38-436c-966a-b2100bdadf9b', '308051501519', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('369ad03e-3c85-4897-90fc-7d3a1d4a8fdc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308122301734@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('369ad03e-3c85-4897-90fc-7d3a1d4a8fdc', '308122301734@alrefaa.edu', 'محمد نصر الدين المقداد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('369ad03e-3c85-4897-90fc-7d3a1d4a8fdc', '308122301734', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d97e9864-f6cf-4816-ae33-8a1315e922d0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307120602301@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d97e9864-f6cf-4816-ae33-8a1315e922d0', '307120602301@alrefaa.edu', 'محمد ياسر سيد محمد مرسى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d97e9864-f6cf-4816-ae33-8a1315e922d0', '307120602301', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('aa2f51b7-2fd0-4665-a38c-bd19b91e0144', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307082301857@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('aa2f51b7-2fd0-4665-a38c-bd19b91e0144', '307082301857@alrefaa.edu', 'منصور بدر عطيه جبر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('aa2f51b7-2fd0-4665-a38c-bd19b91e0144', '307082301857', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fe18f5e4-0839-46fe-8826-90d5909951bc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032001738@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fe18f5e4-0839-46fe-8826-90d5909951bc', '308032001738@alrefaa.edu', 'موسى حامد فيصل جنديل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fe18f5e4-0839-46fe-8826-90d5909951bc', '308032001738', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('ac17cee3-ed80-440d-8ab8-9900e5e1369a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308082502127@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('ac17cee3-ed80-440d-8ab8-9900e5e1369a', '308082502127@alrefaa.edu', 'ناصر بدر مطر عناد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('ac17cee3-ed80-440d-8ab8-9900e5e1369a', '308082502127', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e3a092ef-3615-43c9-9642-d266502ff6b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309010801958@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e3a092ef-3615-43c9-9642-d266502ff6b1', '309010801958@alrefaa.edu', 'ناصر بدر ناصر سليمان الناصر العريفان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e3a092ef-3615-43c9-9642-d266502ff6b1', '309010801958', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('c0cbc9be-b62a-4055-8066-36b10f4c3bd7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307122701901@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('c0cbc9be-b62a-4055-8066-36b10f4c3bd7', '307122701901@alrefaa.edu', 'وليد عادل ثامر حايف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('c0cbc9be-b62a-4055-8066-36b10f4c3bd7', '307122701901', 'fe22fbe7-3310-4b19-9c55-de11f79665a0');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0899327f-10ab-46c0-b5ca-979eda6b2d19', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308062200279@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0899327f-10ab-46c0-b5ca-979eda6b2d19', '308062200279@alrefaa.edu', 'احمد سلطان عيد الهرشانى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0899327f-10ab-46c0-b5ca-979eda6b2d19', '308062200279', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d0419645-33de-400e-9e6b-d4b9034d1e49', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309022701639@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d0419645-33de-400e-9e6b-d4b9034d1e49', '309022701639@alrefaa.edu', 'بدر احمد سلمان عوده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d0419645-33de-400e-9e6b-d4b9034d1e49', '309022701639', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('eaa4afdb-2ff2-4301-a16e-dda0f46c2622', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032300017@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('eaa4afdb-2ff2-4301-a16e-dda0f46c2622', '308032300017@alrefaa.edu', 'بدر موسى حمود غريب العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('eaa4afdb-2ff2-4301-a16e-dda0f46c2622', '308032300017', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4837a722-0160-4706-aee4-37acf896ceb8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308082801338@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4837a722-0160-4706-aee4-37acf896ceb8', '308082801338@alrefaa.edu', 'تركى مبارك بنيان المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4837a722-0160-4706-aee4-37acf896ceb8', '308082801338', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b1365d7c-57b3-4ccd-8817-76916d5d0eac', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309022101334@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b1365d7c-57b3-4ccd-8817-76916d5d0eac', '309022101334@alrefaa.edu', 'جزاع على بوهان على', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b1365d7c-57b3-4ccd-8817-76916d5d0eac', '309022101334', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('b0608b34-df49-4adb-8414-ec937cc89e24', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307102701963@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('b0608b34-df49-4adb-8414-ec937cc89e24', '307102701963@alrefaa.edu', 'حسن عبد الله شهيب حمود', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('b0608b34-df49-4adb-8414-ec937cc89e24', '307102701963', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('24da3652-e12f-4c88-a89c-78837b67c72a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308101400127@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('24da3652-e12f-4c88-a89c-78837b67c72a', '308101400127@alrefaa.edu', 'حمدان ابراهيم حمدان العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('24da3652-e12f-4c88-a89c-78837b67c72a', '308101400127', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('7cd0b7d8-525e-44e7-a316-cc175f632364', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308110402503@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('7cd0b7d8-525e-44e7-a316-cc175f632364', '308110402503@alrefaa.edu', 'سعد احمد معدى ضاحى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('7cd0b7d8-525e-44e7-a316-cc175f632364', '308110402503', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bbc03d6d-74f7-4761-9bb5-f5d022bf2ed1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308121100746@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bbc03d6d-74f7-4761-9bb5-f5d022bf2ed1', '308121100746@alrefaa.edu', 'سعد عيسى حمود العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bbc03d6d-74f7-4761-9bb5-f5d022bf2ed1', '308121100746', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('41530be3-890c-4444-a89e-81a25c73654e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307070900799@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('41530be3-890c-4444-a89e-81a25c73654e', '307070900799@alrefaa.edu', 'سلطان براك ضويحى الهاجرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('41530be3-890c-4444-a89e-81a25c73654e', '307070900799', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('52c85a9c-8ea0-424a-b1a8-788041dc3b18', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307051202717@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('52c85a9c-8ea0-424a-b1a8-788041dc3b18', '307051202717@alrefaa.edu', 'سلمان على سلمان عوده', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('52c85a9c-8ea0-424a-b1a8-788041dc3b18', '307051202717', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('30c6448d-bad6-4475-ac60-4dd8460d193c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032800548@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('30c6448d-bad6-4475-ac60-4dd8460d193c', '308032800548@alrefaa.edu', 'عبدالعزيز سلمان مرشد المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('30c6448d-bad6-4475-ac60-4dd8460d193c', '308032800548', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('fbf61a45-3dfa-43cd-af55-f7e29cfb069a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308090300058@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('fbf61a45-3dfa-43cd-af55-f7e29cfb069a', '308090300058@alrefaa.edu', 'عبدالله احمد حمدان العنزى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('fbf61a45-3dfa-43cd-af55-f7e29cfb069a', '308090300058', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('34386203-9f8d-401b-ac1f-aa27590b6418', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308091700248@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('34386203-9f8d-401b-ac1f-aa27590b6418', '308091700248@alrefaa.edu', 'عبدالله جميل حورى الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('34386203-9f8d-401b-ac1f-aa27590b6418', '308091700248', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('270ce1d0-0a33-45e9-beb1-f6ee31e1f2b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '306070800793@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('270ce1d0-0a33-45e9-beb1-f6ee31e1f2b9', '306070800793@alrefaa.edu', 'عبدالله راشد سعد المانع', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('270ce1d0-0a33-45e9-beb1-f6ee31e1f2b9', '306070800793', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2979ad00-eb5c-4896-90ca-2b6868ce6db2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309030901649@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2979ad00-eb5c-4896-90ca-2b6868ce6db2', '309030901649@alrefaa.edu', 'عبدالله محمد هذال المطيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2979ad00-eb5c-4896-90ca-2b6868ce6db2', '309030901649', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4c79607e-3470-4eae-9e0d-4ba022655b74', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308050601673@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4c79607e-3470-4eae-9e0d-4ba022655b74', '308050601673@alrefaa.edu', 'علي سعود جابر سنان', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4c79607e-3470-4eae-9e0d-4ba022655b74', '308050601673', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('008b592f-c52c-43a2-8a89-e503d1e7b8b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307061601957@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('008b592f-c52c-43a2-8a89-e503d1e7b8b9', '307061601957@alrefaa.edu', 'علي عواد سلمان هويت', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('008b592f-c52c-43a2-8a89-e503d1e7b8b9', '307061601957', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('d10b37e6-4592-4d3d-bfbb-a39d23d2db5f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308080300572@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('d10b37e6-4592-4d3d-bfbb-a39d23d2db5f', '308080300572@alrefaa.edu', 'علي فواز حمود الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('d10b37e6-4592-4d3d-bfbb-a39d23d2db5f', '308080300572', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e53a18d1-5c71-401e-9906-efc24b834837', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051500161@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e53a18d1-5c71-401e-9906-efc24b834837', '308051500161@alrefaa.edu', 'عمر تركى فالح الحربي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e53a18d1-5c71-401e-9906-efc24b834837', '308051500161', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('3dd88556-1486-409b-bd6b-86355772d88e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '920882300001@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('3dd88556-1486-409b-bd6b-86355772d88e', '920882300001@alrefaa.edu', 'محمد عدنان شمخي حزام', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('3dd88556-1486-409b-bd6b-86355772d88e', '920882300001', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('37aff88a-529a-4e50-8892-eaf0471d78c4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308101500742@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('37aff88a-529a-4e50-8892-eaf0471d78c4', '308101500742@alrefaa.edu', 'محمد احمد جهير الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('37aff88a-529a-4e50-8892-eaf0471d78c4', '308101500742', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('44a53a50-7a10-40cf-8669-6de234291385', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308060600076@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('44a53a50-7a10-40cf-8669-6de234291385', '308060600076@alrefaa.edu', 'محمد ظارى حورى الظفيرى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('44a53a50-7a10-40cf-8669-6de234291385', '308060600076', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6cf3dbfc-f1b0-4d2a-aacf-3da4b5a07e47', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308072001548@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6cf3dbfc-f1b0-4d2a-aacf-3da4b5a07e47', '308072001548@alrefaa.edu', 'مشعل جراح خشمان الظفيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6cf3dbfc-f1b0-4d2a-aacf-3da4b5a07e47', '308072001548', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('bc8c9436-a20e-49dd-870e-32998f7f18a0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308060301981@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('bc8c9436-a20e-49dd-870e-32998f7f18a0', '308060301981@alrefaa.edu', 'مشعل يوسف سعود عيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('bc8c9436-a20e-49dd-870e-32998f7f18a0', '308060301981', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('398c5988-767b-43c7-b5c1-df307a89e4ac', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308121600476@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('398c5988-767b-43c7-b5c1-df307a89e4ac', '308121600476@alrefaa.edu', 'نواف ممدوح بن هلال بن شطي الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('398c5988-767b-43c7-b5c1-df307a89e4ac', '308121600476', 'f73394eb-62f2-47be-be7f-ca982820ae7b');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('a1ca9021-51e9-4435-9f07-43cb8dc3d72e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307090200917@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('a1ca9021-51e9-4435-9f07-43cb8dc3d72e', '307090200917@alrefaa.edu', 'ابراهيم غازي عواد الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('a1ca9021-51e9-4435-9f07-43cb8dc3d72e', '307090200917', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8b46e1e9-d555-4587-873a-920c5c777384', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032700408@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8b46e1e9-d555-4587-873a-920c5c777384', '308032700408@alrefaa.edu', 'تركي راضي محمد القحص', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8b46e1e9-d555-4587-873a-920c5c777384', '308032700408', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0037f99c-d23f-4eed-8158-7e469f412340', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '309021200517@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0037f99c-d23f-4eed-8158-7e469f412340', '309021200517@alrefaa.edu', 'تركي فهد فرحان الجنفاوي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0037f99c-d23f-4eed-8158-7e469f412340', '309021200517', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('aa376abe-17d3-47fc-b6e1-dfb6dd0646f4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308101400434@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('aa376abe-17d3-47fc-b6e1-dfb6dd0646f4', '308101400434@alrefaa.edu', 'راشد يوسف خالد ال بن على', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('aa376abe-17d3-47fc-b6e1-dfb6dd0646f4', '308101400434', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0f873b20-0313-47c8-872c-bf5db0337fe4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307081001879@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0f873b20-0313-47c8-872c-bf5db0337fe4', '307081001879@alrefaa.edu', 'سالم حامد حمد عيد', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0f873b20-0313-47c8-872c-bf5db0337fe4', '307081001879', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8cbd3699-5ff2-4b0b-83f1-edd6a0462a78', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308041000219@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8cbd3699-5ff2-4b0b-83f1-edd6a0462a78', '308041000219@alrefaa.edu', 'سلطان سالم فهد العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8cbd3699-5ff2-4b0b-83f1-edd6a0462a78', '308041000219', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('8fdc6493-c98a-41b7-bac9-0758ab05546e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308070600969@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('8fdc6493-c98a-41b7-bac9-0758ab05546e', '308070600969@alrefaa.edu', 'طلال سالم حمود الهاجري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('8fdc6493-c98a-41b7-bac9-0758ab05546e', '308070600969', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('aed77e82-5cd5-4a14-ad36-d2753caf5fa4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307111300627@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('aed77e82-5cd5-4a14-ad36-d2753caf5fa4', '307111300627@alrefaa.edu', 'طلال عبدالله مبخوت العجمي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('aed77e82-5cd5-4a14-ad36-d2753caf5fa4', '307111300627', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('6c10b123-c6a5-47fd-a15d-33e938100497', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308030601959@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('6c10b123-c6a5-47fd-a15d-33e938100497', '308030601959@alrefaa.edu', 'عبدالرحمن فايز عيدان شريف', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('6c10b123-c6a5-47fd-a15d-33e938100497', '308030601959', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('e7095085-32d8-4cc1-9d44-a9252542cd21', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308072200643@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('e7095085-32d8-4cc1-9d44-a9252542cd21', '308072200643@alrefaa.edu', 'عبدالعزيز بدر حمد الخالدي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('e7095085-32d8-4cc1-9d44-a9252542cd21', '308072200643', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('44524c4f-32e0-421b-9f20-d9c1949d3d23', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '913882300031@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('44524c4f-32e0-421b-9f20-d9c1949d3d23', '913882300031@alrefaa.edu', 'عبدالله خالد ثاني ناصر', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('44524c4f-32e0-421b-9f20-d9c1949d3d23', '913882300031', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('4034c06e-d3ab-4b34-859b-59088c6e71b4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308051300901@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('4034c06e-d3ab-4b34-859b-59088c6e71b4', '308051300901@alrefaa.edu', 'عبدالمحسن خالد فالح الحسينى', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('4034c06e-d3ab-4b34-859b-59088c6e71b4', '308051300901', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('2ffe4cfd-df27-42d6-ada7-867cbe0fabe4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308081800675@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('2ffe4cfd-df27-42d6-ada7-867cbe0fabe4', '308081800675@alrefaa.edu', 'عمر خلف عايض الميموني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('2ffe4cfd-df27-42d6-ada7-867cbe0fabe4', '308081800675', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('129fa31d-1c4f-40c6-bc04-d0c4e28e39c5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032800361@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('129fa31d-1c4f-40c6-bc04-d0c4e28e39c5', '308032800361@alrefaa.edu', 'فارس محمد محارب العنزي', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('129fa31d-1c4f-40c6-bc04-d0c4e28e39c5', '308032800361', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('0faa7b91-acdf-4b4c-a3ca-d3ba95c052eb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308122201047@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('0faa7b91-acdf-4b4c-a3ca-d3ba95c052eb', '308122201047@alrefaa.edu', 'محمد موسى تركي المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('0faa7b91-acdf-4b4c-a3ca-d3ba95c052eb', '308122201047', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('1433fad5-ee65-48ae-97a1-c9b124c9bb0c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308010801021@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('1433fad5-ee65-48ae-97a1-c9b124c9bb0c', '308010801021@alrefaa.edu', 'مشعل عادل فهد المطيري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('1433fad5-ee65-48ae-97a1-c9b124c9bb0c', '308010801021', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('cf0f53d8-9ab8-4a11-9379-43f619b63ab9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '307122401343@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('cf0f53d8-9ab8-4a11-9379-43f619b63ab9', '307122401343@alrefaa.edu', 'مشل خالد يوسف الشمري', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('cf0f53d8-9ab8-4a11-9379-43f619b63ab9', '307122401343', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('46994373-2e46-426a-b8fa-9203f6fb31c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308040900805@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('46994373-2e46-426a-b8fa-9203f6fb31c1', '308040900805@alrefaa.edu', 'مناور خالد محمد الحليل', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('46994373-2e46-426a-b8fa-9203f6fb31c1', '308040900805', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES ('05c324df-effe-4269-92c2-e0004b0da4f5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '308032400659@alrefaa.edu', crypt('12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"student"}', now(), now());
INSERT INTO public.users (id, email, full_name, role) VALUES ('05c324df-effe-4269-92c2-e0004b0da4f5', '308032400659@alrefaa.edu', 'وليد ضاوي مطر الديحاني', 'student');
INSERT INTO public.students (id, national_id, section_id) VALUES ('05c324df-effe-4269-92c2-e0004b0da4f5', '308032400659', '63167b6e-3c69-4fe5-9e6e-ee18d8a19b59');

