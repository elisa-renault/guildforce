import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GlowCard } from '@/components/GlowCard';
import { PollQuestionEditor } from './PollQuestionEditor';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import type { SectionFormData, QuestionFormData } from '@/types/poll';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

interface PollSectionEditorProps {
  section: SectionFormData;
  index: number;
  onChange: (section: SectionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const defaultQuestion: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  is_required: true,
  options: ['', ''],
};

export const PollSectionEditor = ({
  section,
  index,
  onChange,
  onRemove,
  canRemove,
}: PollSectionEditorProps) => {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const [isOpen, setIsOpen] = useState(true);

  const handleAddQuestion = () => {
    onChange({
      ...section,
      questions: [...section.questions, { ...defaultQuestion }],
    });
  };

  const handleQuestionChange = (qIndex: number, question: QuestionFormData) => {
    onChange({
      ...section,
      questions: section.questions.map((q, i) => (i === qIndex ? question : q)),
    });
  };

  const handleRemoveQuestion = (qIndex: number) => {
    onChange({
      ...section,
      questions: section.questions.filter((_, i) => i !== qIndex),
    });
  };

  return (
    <GlowCard surface="section">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 pt-2 text-muted-foreground">
            <GripVertical className="h-5 w-5 cursor-grab" />
            <span className="text-sm font-medium text-primary">
              {interpolateMessage(s('polls.section.section_label'), { index: index + 1 })}
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <Input
                  value={section.title}
                  onChange={(e) => onChange({ ...section, title: e.target.value })}
                  placeholder={t.polls.sectionTitle}
                  className="bg-background font-medium"
                />
                <Textarea
                  value={section.description}
                  onChange={(e) => onChange({ ...section, description: e.target.value })}
                  placeholder={t.polls.sectionDescription}
                  autoResize
                  className="bg-background resize-none text-sm"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <CollapsibleContent className="space-y-3">
              {section.questions.map((question, qIndex) => (
                <PollQuestionEditor
                  key={qIndex}
                  question={question}
                  index={qIndex}
                  onChange={(q) => handleQuestionChange(qIndex, q)}
                  onRemove={() => handleRemoveQuestion(qIndex)}
                  canRemove={section.questions.length > 0}
                  compact
                />
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddQuestion}
                className="text-primary w-full border border-dashed border-primary/30 hover:border-primary/50"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.polls.addQuestionToSection}
              </Button>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
    </GlowCard>
  );
};
