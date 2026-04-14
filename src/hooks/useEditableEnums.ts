/**
 * Editable enums CRUD hook — create/update/delete enum values
 */
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useEditableEnums() {
  const addEnumValue = useCallback(
    async (enumName: string, value: string, options?: { isPublic?: boolean; displayOrder?: number }) => {
      const { data, error } = await supabase
        .from('editable_enums')
        .insert({
          enum_name: enumName,
          enum_value: value,
          display_order: options?.displayOrder ?? 0,
          is_active: true,
          is_public: options?.isPublic ?? false,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    []
  );

  const updateEnumValue = useCallback(
    async (
      id: string,
      updates: Partial<{
        enum_value: string;
        is_active: boolean;
        is_public: boolean;
        display_order: number;
      }>
    ) => {
      const { data, error } = await supabase
        .from('editable_enums')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    []
  );

  const deleteEnumValue = useCallback(async (id: string) => {
    const { error } = await supabase.from('editable_enums').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const reorderEnumValue = useCallback(
    async (id: string, newOrder: number) => {
      return updateEnumValue(id, { display_order: newOrder });
    },
    [updateEnumValue]
  );

  return {
    addEnumValue,
    updateEnumValue,
    deleteEnumValue,
    reorderEnumValue,
  };
}
