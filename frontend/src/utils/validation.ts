export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const validateEmail = (email: string): boolean => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmedEmail);
};

import { isValidPhoneNumber } from 'react-phone-number-input';

const PHONE_MAX_LENGTHS: Record<string, number> = {
  IN: 10,
  US: 10,
  CA: 10,
  ID: 12,
  MY: 10,
  GB: 11,
};

export const validatePhone = (phone: string, countryCode: string): boolean => {
  const digitsOnly = phone.replace(/\D/g, '');

  if (!digitsOnly) return false;

  return isValidPhoneNumber(digitsOnly, countryCode as any);
};

export const getPhoneMaxLength = (countryCode: string): number => {
  return PHONE_MAX_LENGTHS[countryCode] ?? 15;
};

export const getPhoneValidationError = (countryCode: string, countryName: string): string => {
  if (countryCode === 'IN') {
    return 'Enter a valid 10-digit Indian mobile number';
  }
  return `Enter a valid phone number for ${countryName}`;
};

export const validatePassword = (password: string): boolean => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
};

export const validateName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
};

export const validateEmployeeId = (employeeId: string): boolean => {
  const trimmed = employeeId.trim();
  if (trimmed.length < 3) return false;
  // Allow only letters, numbers, hyphen, underscore
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(trimmed);
};