import { Stack } from 'expo-router';
import React from 'react';

export default function ModalLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ presentation: 'modal', headerShown: false }}>
      <Stack.Screen name="edit-enums" />
      <Stack.Screen name="manage-users" />
      <Stack.Screen name="invite-user" />
      <Stack.Screen name="report-bug" />
      <Stack.Screen name="request-feature" />
      <Stack.Screen name="area-colors" />
      <Stack.Screen name="add-location" />
    </Stack>
  );
}
