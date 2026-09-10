import { StyleSheet } from 'react-native'

/** Shared overlay/panel/button styling for the shell's modal dialogs. */
export const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  panel: {
    width: 420,
    maxWidth: '90%',
    borderRadius: 10,
    padding: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  error: {
    fontSize: 13,
    color: '#b91c1c',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#475569',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
