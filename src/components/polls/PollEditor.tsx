import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlowCard } from '@/components/GlowCard';
import { PollQuestionEditor } from './PollQuestionEditor';
import { PollSectionEditor } from './PollSectionEditor';
import { Plus, Save, Play, Loader2, Layers } from 'lucide-react';
import type { PollFormData, QuestionFormData, SectionFormData } from '@/types/poll';

interface Roster {
  id: string;
  name: string;
}

interface PollEditorProps {
  initialData?: PollFormData;
  rosters: Roster[];
  onSave: (data: PollFormData) => Promise<void>;
  onPublish?: (data: PollFormData) => Promise<void>;
  saving?: boolean;
}

const defaultQuestion: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  is_required: true,
  options: ['', ''],
};

const defaultSection: SectionFormData = {
  title: '',
  description: '',
  questions: [{ ...defaultQuestion }],
};

export const PollEditor = ({
  initialData,
  rosters,
  onSave,
  onPublish,
  saving = false,
}: PollEditorProps) => {
  const { language } = useLanguage();
  
  const [formData, setFormData] = useState<PollFormData>(initialData || {
    title: '',
    description: '',
    is_anonymous: false,
    allow_multiple_responses: false,
    roster_id: null,
    ends_at: null,
    sections: [],
    questions: [{ ...defaultQuestion }],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        sections: initialData.sections || [],
        questions: initialData.questions || [{ ...defaultQuestion }],
      });
    }
  }, [initialData]);

  // Questions without section
  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...defaultQuestion }],
    }));
  };

  const handleQuestionChange = (index: number, question: QuestionFormData) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? question : q)),
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // Sections
  const handleAddSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...defaultSection }],
    }));
  };

  const handleSectionChange = (index: number, section: SectionFormData) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? section : s)),
    }));
  };

  const handleRemoveSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    await onSave(formData);
  };

  const handlePublish = async () => {
    if (onPublish) {
      await onPublish(formData);
    }
  };

  const validateQuestion = (q: QuestionFormData) => {
    if (!q.question_text.trim()) return false;
    if (q.question_type === 'text' || q.question_type === 'rating' || 
        q.question_type === 'date' || q.question_type === 'time' || 
        q.question_type === 'datetime' || q.question_type === 'scale') {
      return true;
    }
    return q.options.every(o => o.trim());
  };

  const allQuestionsValid = [
    ...formData.questions,
    ...formData.sections.flatMap(s => s.questions),
  ].every(validateQuestion);

  const hasQuestions = formData.questions.length > 0 || 
    formData.sections.some(s => s.questions.length > 0);

  const isValid = formData.title.trim() && hasQuestions && allQuestionsValid;

  return (
    <div className="space-y-6">
      <GlowCard className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {language === 'fr' ? 'Informations générales' : 'General Information'}
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {language === 'fr' ? 'Titre du sondage' : 'Poll Title'} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={language === 'fr' ? 'Ex: Retour sur la saison 3' : 'Ex: Season 3 Feedback'}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {language === 'fr' ? 'Description (optionnelle)' : 'Description (optional)'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={language === 'fr' 
                ? 'Expliquez le but du sondage...' 
                : 'Explain the purpose of this poll...'}
              className="bg-background resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {language === 'fr' ? 'Roster ciblé' : 'Target Roster'}
              </Label>
              <Select
                value={formData.roster_id || 'all'}
                onValueChange={(value) => setFormData((prev) => ({ 
                  ...prev, 
                  roster_id: value === 'all' ? null : value 
                }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'fr' ? 'Tous les membres' : 'All members'}
                  </SelectItem>
                  {rosters.map((roster) => (
                    <SelectItem key={roster.id} value={roster.id}>
                      {roster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">
                {language === 'fr' ? 'Date de clôture (optionnelle)' : 'End Date (optional)'}
              </Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={formData.ends_at ? formData.ends_at.slice(0, 16) : ''}
                onChange={(e) => setFormData((prev) => ({ 
                  ...prev, 
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                }))}
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_anonymous: checked }))}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                {language === 'fr' ? 'Réponses anonymes' : 'Anonymous responses'}
              </Label>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Sections */}
      {formData.sections.length > 0 && (
        <GlowCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {language === 'fr' ? 'Sections' : 'Sections'}
            </h2>
          </div>

          <div className="space-y-4">
            {formData.sections.map((section, index) => (
              <PollSectionEditor
                key={index}
                section={section}
                index={index}
                onChange={(s) => handleSectionChange(index, s)}
                onRemove={() => handleRemoveSection(index)}
                canRemove={true}
              />
            ))}
          </div>
        </GlowCard>
      )}

      {/* Questions without section */}
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {formData.sections.length > 0 
              ? (language === 'fr' ? 'Questions générales' : 'General Questions')
              : (language === 'fr' ? 'Questions' : 'Questions')}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAddSection}>
              <Layers className="h-4 w-4 mr-1" />
              {language === 'fr' ? 'Section' : 'Section'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4 mr-1" />
              {language === 'fr' ? 'Question' : 'Question'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {formData.questions.length === 0 && formData.sections.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              {language === 'fr' 
                ? 'Ajoutez des questions ou des sections pour commencer' 
                : 'Add questions or sections to get started'}
            </p>
          )}
          {formData.questions.map((question, index) => (
            <PollQuestionEditor
              key={index}
              question={question}
              index={index}
              onChange={(q) => handleQuestionChange(index, q)}
              onRemove={() => handleRemoveQuestion(index)}
              canRemove={formData.questions.length > 1 || formData.sections.some(s => s.questions.length > 0)}
            />
          ))}
        </div>
      </GlowCard>

      {/* Sticky actions */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 sm:rounded-lg px-4 py-3 bg-background/80 backdrop-blur border border-border/50">
        {/* Validation feedback */}
        {!isValid && formData.title.trim() && (
          <div className="mb-2 text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Remplis toutes les options de réponse (A, B, …) pour pouvoir publier.'
              : 'Fill in all answer options (A, B, …) to publish.'}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!formData.title.trim() || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {language === 'fr' ? 'Enregistrer brouillon' : 'Save Draft'}
          </Button>

          {onPublish && (
            <Button
              onClick={handlePublish}
              disabled={!isValid || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {language === 'fr' ? 'Publier le sondage' : 'Publish Poll'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
