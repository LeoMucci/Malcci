import React, { useState, useMemo } from 'react';
import { Modal, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

interface DatePickerProps {
  value: string; // Formato: YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  clearable?: boolean;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayStr}`;
}

function buildPickerCells(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];

  // Padding mês anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({
      day,
      currentMonth: false,
      dateStr: toIsoDate(year, month - 1, day),
    });
  }

  // Dias do mês atual
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      currentMonth: true,
      dateStr: toIsoDate(year, month, day),
    });
  }

  // Padding próximo mês
  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      day,
      currentMonth: false,
      dateStr: toIsoDate(year, month + 1, day),
    });
  }

  return cells;
}

export default function DatePicker({ value, onChange, placeholder = 'Selecionar data', style, clearable = false }: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(value ? `${value}T12:00:00` : new Date());
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const formattedValue = useMemo(() => {
    if (!value) return '';
    const d = new Date(`${value}T12:00:00`);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [value]);

  const cells = useMemo(() => buildPickerCells(viewDate), [viewDate]);
  const monthLabel = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const todayIso = new Date().toISOString().split('T')[0];

  const handleOpen = () => {
    const d = new Date(value ? `${value}T12:00:00` : new Date());
    setViewDate(isNaN(d.getTime()) ? new Date() : d);
    setVisible(true);
  };

  const changeMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const changeYear = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  const handleDaySelect = (dateStr: string) => {
    onChange(dateStr);
    setVisible(false);
  };

  return (
    <View style={style}>
      <TouchableOpacity style={styles.inputBox} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {formattedValue || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            {/* Cabeçalho de Navegação */}
            <View style={styles.header}>
              <View style={styles.navGroup}>
                <TouchableOpacity onPress={() => changeYear(-1)} style={styles.navBtn} hitSlop={8}>
                  <Text style={styles.navTextYear}>«</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn} hitSlop={8}>
                  <Text style={styles.navText}>‹</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              
              <View style={styles.navGroup}>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn} hitSlop={8}>
                  <Text style={styles.navText}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeYear(1)} style={styles.navBtn} hitSlop={8}>
                  <Text style={styles.navTextYear}>»</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Grid de Dias */}
            <View style={styles.grid}>
              {WEEKDAY_LABELS.map((label, idx) => (
                <Text key={`wl-${idx}`} style={styles.weekday}>{label}</Text>
              ))}
              
              {cells.map((cell, idx) => {
                const isSelected = cell.dateStr === value;
                const isToday = cell.dateStr === todayIso;
                
                return (
                  <TouchableOpacity
                    key={`cell-${idx}`}
                    style={[
                      styles.dayCell,
                      !cell.currentMonth && styles.dayOtherMonth,
                      isToday && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}
                    onPress={() => handleDaySelect(cell.dateStr)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !cell.currentMonth && styles.dayTextOtherMonth,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rodapé */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              
              {clearable && (
                <TouchableOpacity style={styles.clearBtn} onPress={() => handleDaySelect('')} activeOpacity={0.7}>
                  <Text style={styles.clearBtnText}>Limpar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.todayBtn} 
                onPress={() => handleDaySelect(todayIso)} 
                activeOpacity={0.7}
              >
                <Text style={styles.todayBtnText}>Hoje</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calendarIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  inputText: {
    fontSize: 14.5,
    color: COLORS.text,
  },
  placeholderText: {
    color: '#b6a3aa',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,10,14,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#1a0d12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: COLORS.muted,
    fontSize: 20,
    fontWeight: 'bold',
  },
  navTextYear: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#bca7ad',
    paddingBottom: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dayOtherMonth: {
    opacity: 0.35,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  daySelected: {
    backgroundColor: COLORS.accent,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.text,
  },
  dayTextOtherMonth: {
    color: COLORS.muted,
  },
  dayTextToday: {
    fontWeight: 'bold',
    color: COLORS.accentDeep,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13.5,
    color: COLORS.muted,
    fontWeight: '500',
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 13.5,
    color: '#b03a48',
    fontWeight: '500',
  },
  todayBtn: {
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 13.5,
    color: COLORS.accentDeep,
    fontWeight: '600',
  },
});
