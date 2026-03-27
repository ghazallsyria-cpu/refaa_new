export interface Teacher {
  id: string;
  users: {
    full_name: string;
  };
}

export interface Subject {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
  classes: {
    name: string;
  };
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  teacher_id: string;
  due_date?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  file_url?: string;
}
