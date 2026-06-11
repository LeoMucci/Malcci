import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';
import { sharedStyles } from '@/constants/shared-styles';
import { useToast } from '@/components/ui/toast';
import { cleanText, isNonEmpty, isValidUrl, LIMITS, parsePrice } from '@/lib/validation';
import { getCategoryLabel, PRIORITY_OPTIONS, type WishlistCategory, type WishlistPriority } from './constants';

export interface WishlistFormInput {
  title: string;
  description: string | null;
  category: WishlistCategory;
  priority: WishlistPriority;
  price: number | null;
  url: string | null;
}

interface WishlistFormModalProps {
  category: WishlistCategory;
  onClose: () => void;
  /** Persiste o item. Retorna true para fechar o formulário. */
  onSubmit: (input: WishlistFormInput) => Promise<boolean>;
}

export function WishlistFormModal({ category, onClose, onSubmit }: WishlistFormModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const cleanTitle = cleanText(title, LIMITS.title);
    if (!isNonEmpty(cleanTitle)) return;

    let priceValue: number | null = null;
    if (isNonEmpty(price)) {
      priceValue = parsePrice(price);
      if (priceValue === null) {
        showToast('Preço inválido. Use apenas números, ex: 150,00.', 'error');
        return;
      }
    }

    let urlValue: string | null = null;
    const cleanUrl = cleanText(url, LIMITS.url);
    if (isNonEmpty(cleanUrl)) {
      urlValue = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
      if (!isValidUrl(urlValue)) {
        showToast('Link inválido. Confira o endereço informado.', 'error');
        return;
      }
    }

    setSubmitting(true);
    const saved = await onSubmit({
      title: cleanTitle,
      description: cleanText(description, LIMITS.description) || null,
      category,
      priority,
      price: priceValue,
      url: urlValue,
    });
    setSubmitting(false);
    if (saved) onClose();
  }, [title, description, price, url, priority, category, onSubmit, onClose, showToast]);

  const isDisabled = !isNonEmpty(title) || submitting;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Adicionar Desejo</Text>

        <Text style={sharedStyles.label}>O que vocês querem?</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: Cafeteira Italiana, Jantar no restaurante X..."
          value={title}
          onChangeText={setTitle}
          maxLength={LIMITS.title}
        />

        <Text style={sharedStyles.label}>Descrição / Detalhes</Text>
        <TextInput
          style={[sharedStyles.input, styles.inputShortMultiline]}
          placeholder="Ex: Cor preta, de preferência marca Y"
          multiline
          numberOfLines={2}
          value={description}
          onChangeText={setDescription}
          maxLength={LIMITS.description}
        />

        <View style={styles.row}>
          <View style={styles.rowFieldLeft}>
            <Text style={sharedStyles.label}>Preço Estimado</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="R$ 150.00"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>
          <View style={styles.rowField}>
            <Text style={sharedStyles.label}>Categoria</Text>
            <TextInput
              style={[sharedStyles.input, styles.inputReadonly]}
              value={getCategoryLabel(category).split(' ')[1]}
              editable={false}
            />
          </View>
        </View>

        <Text style={sharedStyles.label}>Link (Opcional)</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex: amazon.com.br/produto..."
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          maxLength={LIMITS.url}
        />

        <Text style={sharedStyles.label}>Prioridade</Text>
        <View style={styles.typeGrid}>
          {PRIORITY_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[styles.typeButton, priority === option.key && styles.typeButtonSelected]}
              onPress={() => setPriority(option.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeButtonText, priority === option.key && styles.typeButtonTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalBtn, styles.saveBtn, isDisabled && styles.saveDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>Sugerir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(20, 10, 15, 0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, zIndex: 99 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 19, fontStyle: 'italic', color: COLORS.text, fontWeight: '500', marginBottom: 16, textAlign: 'center' },

  row: { flexDirection: 'row' },
  rowField: { flex: 1 },
  rowFieldLeft: { flex: 1, marginRight: 8 },
  inputShortMultiline: { minHeight: 50, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#f5f5f5', color: '#999' },

  typeGrid: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  typeButton: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  typeButtonSelected: { backgroundColor: COLORS.headerBg, borderColor: COLORS.headerBg },
  typeButtonText: { fontSize: 11, color: COLORS.muted, fontWeight: '500' },
  typeButtonTextSelected: { color: COLORS.headerAccent, fontWeight: '600' },

  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: 13.5, fontWeight: '500', color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent },
  saveDisabled: { backgroundColor: COLORS.accentSoft, opacity: 0.7 },
  saveBtnText: { fontSize: 13.5, fontWeight: '500', color: '#ffffff' },
});
