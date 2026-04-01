import tkinter as tk
from tkinter import ttk
import json
import os

class QuestionEntryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("JSON Soru Ekleme Aracı")
        self.root.geometry("650x800") 
        self.file_name = "yds_2008_mayis.json"

        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TLabel", font=("Arial", 10, "bold"))
        style.configure("TButton", font=("Arial", 10, "bold"))

        self.create_widgets()
        self.bind_shortcuts()

    def create_widgets(self):
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Tab tuşu ile Text widget'lar arası geçişi sağlayan yardımcı fonksiyonlar
        def focus_next_widget(event):
            event.widget.tk_focusNext().focus()
            return "break" # Text kutusuna tab karakteri eklenmesini engeller

        def focus_prev_widget(event):
            event.widget.tk_focusPrev().focus()
            return "break"

        # ID, Exam, Category Satırı
        row1 = tk.Frame(main_frame)
        row1.pack(fill=tk.X, pady=5)
        
        ttk.Label(row1, text="Soru ID:").pack(side=tk.LEFT)
        self.entry_id = ttk.Entry(row1, width=15)
        self.entry_id.pack(side=tk.LEFT, padx=(5, 15))

        ttk.Label(row1, text="Sınav:").pack(side=tk.LEFT)
        self.entry_exam = ttk.Entry(row1, width=20)
        self.entry_exam.pack(side=tk.LEFT, padx=(5, 15))

        ttk.Label(row1, text="Kategori:").pack(side=tk.LEFT)
        self.entry_category = ttk.Entry(row1, width=15)
        self.entry_category.pack(side=tk.LEFT, padx=5)

        # Açıklama (Description)
        row2 = tk.Frame(main_frame)
        row2.pack(fill=tk.X, pady=5)
        ttk.Label(row2, text="Açıklama:").pack(side=tk.LEFT)
        self.entry_desc = ttk.Entry(row2)
        self.entry_desc.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)

        # Paragraf / Ortak Metin (Kalıcı alan)
        ttk.Label(main_frame, text="Ortak Metin / Paragraf (JSON'da soru metniyle birleşir):").pack(anchor=tk.W, pady=(10, 0))
        self.text_paragraph = tk.Text(main_frame, height=4, font=("Arial", 10))
        self.text_paragraph.pack(fill=tk.X, pady=5)
        self.text_paragraph.bind("<Tab>", focus_next_widget)
        self.text_paragraph.bind("<Shift-Tab>", focus_prev_widget)

        # Soru Metni (Değişken alan)
        ttk.Label(main_frame, text="Soru Metni:").pack(anchor=tk.W, pady=(5, 0))
        self.text_question = tk.Text(main_frame, height=4, font=("Arial", 10))
        self.text_question.pack(fill=tk.X, pady=5)
        self.text_question.bind("<Tab>", focus_next_widget)
        self.text_question.bind("<Shift-Tab>", focus_prev_widget)

        # Şıklar (Options)
        self.options = {}
        options_frame = tk.Frame(main_frame)
        options_frame.pack(fill=tk.X, pady=10)

        for opt in ["A", "B", "C", "D", "E"]:
            opt_row = tk.Frame(options_frame)
            opt_row.pack(fill=tk.X, pady=3)
            
            ttk.Label(opt_row, text=f"{opt})", width=3).pack(side=tk.LEFT, anchor=tk.N, pady=2)
            
            entry = tk.Text(opt_row, height=2, font=("Arial", 10))
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            # Şıklar için Tab ve Shift+Tab ataması
            entry.bind("<Tab>", focus_next_widget)
            entry.bind("<Shift-Tab>", focus_prev_widget)
            
            self.options[opt] = entry

        # Doğru Cevap
        row_answer = tk.Frame(main_frame)
        row_answer.pack(fill=tk.X, pady=10)
        ttk.Label(row_answer, text="Doğru Cevap:").pack(side=tk.LEFT)
        
        self.answer_var = tk.StringVar()
        self.answer_cb = ttk.Combobox(row_answer, textvariable=self.answer_var, values=["A", "B", "C", "D", "E"], state="readonly", width=5)
        self.answer_cb.pack(side=tk.LEFT, padx=10)

        # Butonlar
        btn_frame = tk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=10)

        self.btn_save = ttk.Button(btn_frame, text="Kaydet (Ctrl+S)", command=self.save_question)
        self.btn_save.pack(side=tk.RIGHT, padx=5)

        self.btn_clear = ttk.Button(btn_frame, text="Temizle (Ctrl+L)", command=self.clear_fields)
        self.btn_clear.pack(side=tk.RIGHT, padx=5)
        
        # Durum Çubuğu
        self.status_label = ttk.Label(main_frame, text="Hazır.", foreground="blue")
        self.status_label.pack(side=tk.LEFT, pady=10)

    def bind_shortcuts(self):
        self.root.bind('<Control-s>', lambda event: self.save_question())
        self.root.bind('<Control-l>', lambda event: self.clear_fields())

    def save_question(self):
        q_id = self.entry_id.get().strip()
        exam = self.entry_exam.get().strip()
        category = self.entry_category.get().strip()
        desc = self.entry_desc.get().strip()
        
        p_text = self.text_paragraph.get("1.0", tk.END).strip()
        q_text = self.text_question.get("1.0", tk.END).strip()
        
        if p_text and q_text:
            combined_question = f"{p_text}\n\n{q_text}" 
        elif p_text:
            combined_question = p_text
        else:
            combined_question = q_text

        answer = self.answer_var.get()
        
        options_dict = {opt: entry.get("1.0", tk.END).strip() for opt, entry in self.options.items()}

        new_question = {
            "id": q_id,
            "description": desc,
            "exam": exam,
            "category": category,
            "question": combined_question,
            "options": options_dict,
            "answer": answer
        }

        # JSON dosyasına ekle
        data = []
        if os.path.exists(self.file_name):
            try:
                with open(self.file_name, 'r', encoding='utf-8') as file:
                    data = json.load(file)
            except json.JSONDecodeError:
                pass

        data.append(new_question)

        with open(self.file_name, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=2, ensure_ascii=False)

        self.status_label.config(text=f"Son Kaydedilen: {q_id} başarıyla eklendi!", foreground="green")
        
        self.prepare_next_question(q_id)

    def prepare_next_question(self, current_id):
        self.text_question.delete("1.0", tk.END)
        for entry in self.options.values():
            entry.delete("1.0", tk.END)
        self.answer_cb.set('')

        try:
            parts = current_id.rsplit('_', 1) 
            if len(parts) == 2 and parts[1].isdigit():
                next_num = int(parts[1]) + 1
                new_id = f"{parts[0]}_{next_num}"
                self.entry_id.delete(0, tk.END)
                self.entry_id.insert(0, new_id)
            elif current_id.isdigit():
                new_id = str(int(current_id) + 1)
                self.entry_id.delete(0, tk.END)
                self.entry_id.insert(0, new_id)
        except Exception:
            pass

        self.text_question.focus_set()

    def clear_fields(self):
        self.entry_id.delete(0, tk.END)
        self.entry_exam.delete(0, tk.END)
        self.entry_category.delete(0, tk.END)
        self.entry_desc.delete(0, tk.END)
        self.text_paragraph.delete("1.0", tk.END)
        self.text_question.delete("1.0", tk.END)
        for entry in self.options.values():
            entry.delete("1.0", tk.END)
        self.answer_cb.set('')
        self.status_label.config(text="Tüm alanlar temizlendi.", foreground="blue")

if __name__ == "__main__":
    root = tk.Tk()
    app = QuestionEntryApp(root)
    root.mainloop()