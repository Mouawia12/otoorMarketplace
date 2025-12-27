import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

type RichTextEditorModalProps = {
  isOpen: boolean;
  title: string;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
};

export default function RichTextEditorModal({
  isOpen,
  title,
  value,
  onSave,
  onClose,
}: RichTextEditorModalProps) {
  const { i18n, t } = useTranslation();
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (isOpen) {
      setDraft(value ?? '');
    }
  }, [isOpen, value]);

  const editorConfig = useMemo(
    () => ({
      language:
        i18n.language === 'ar'
          ? { ui: 'ar', content: 'ar' }
          : { ui: 'en', content: 'en' },
      toolbar: {
        items: [
          'heading',
          '|',
          'bold',
          'italic',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'link',
          'blockQuote',
          '|',
          'insertTable',
          'imageUpload',
          '|',
          'undo',
          'redo',
        ],
        shouldNotGroupWhenFull: true,
      },
      link: {
        decorators: {
          openInNewTab: {
            mode: 'manual',
            label: i18n.language === 'ar' ? 'فتح في نافذة جديدة' : 'Open in new tab',
            defaultValue: true,
            attributes: {
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          },
        },
      },
      simpleUpload: {
        uploadUrl: '/api/uploads/image',
        withCredentials: true,
        headers: {},
      },
    }),
    [i18n.language]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-charcoal">{title}</h3>
          <button onClick={onClose} className="text-charcoal-light hover:text-charcoal">
            ✕
          </button>
        </div>

        <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <CKEditor
            editor={ClassicEditor as unknown as { create: (...args: unknown[]) => Promise<unknown> }}
            data={draft}
            config={editorConfig}
            onChange={(_event, editor) => {
              setDraft(editor.getData());
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-luxury border border-sand text-charcoal"
          >
            {t('common.cancel', 'إلغاء')}
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="px-5 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover"
          >
            {t('common.save', 'حفظ')}
          </button>
        </div>
      </div>
    </div>
  );
}
