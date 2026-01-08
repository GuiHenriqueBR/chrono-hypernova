// ============================================
// useForm - Hook para formularios com React Hook Form + Zod
// ============================================

import {
  useForm as useRHF,
  UseFormProps,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema } from "zod";
import { useState, useCallback } from "react";

interface UseFormOptions<T extends FieldValues> extends Omit<
  UseFormProps<T>,
  "resolver"
> {
  schema: ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (error: unknown) => void;
}

interface UseFormReturnExtended<
  T extends FieldValues,
> extends UseFormReturn<T> {
  isSubmitting: boolean;
  submitError: string | null;
  handleFormSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  clearSubmitError: () => void;
}

export function useFormWithValidation<T extends FieldValues>({
  schema,
  onSubmit,
  onError,
  ...props
}: UseFormOptions<T>): UseFormReturnExtended<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useRHF<T>({
    // @ts-expect-error - zodResolver type mismatch with strict mode
    resolver: zodResolver(schema),
    mode: "onBlur",
    ...props,
  });

  const handleFormSubmit = useCallback(
    async (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault();
      setSubmitError(null);
      setIsSubmitting(true);

      try {
        // @ts-expect-error - Complex generics mismatch between react-hook-form and zodResolver
        await form.handleSubmit(async (data: T) => {
          await onSubmit(data);
        })(e);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Ocorreu um erro inesperado";
        setSubmitError(errorMessage);
        onError?.(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, onSubmit, onError]
  );

  const clearSubmitError = useCallback(() => {
    setSubmitError(null);
  }, []);

  return {
    ...form,
    isSubmitting,
    submitError,
    handleFormSubmit,
    clearSubmitError,
  } as unknown as UseFormReturnExtended<T>;
}

// ============================================
// Form Field Component Helpers
// ============================================

import type {
  FieldError,
  RegisterOptions,
  UseFormRegister,
  Path,
} from "react-hook-form";

export interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  rules?: RegisterOptions<T>;
}

export function getFieldError<T extends FieldValues>(
  errors: Partial<Record<keyof T, FieldError>>,
  name: keyof T
): string | undefined {
  return errors[name]?.message;
}

// ============================================
// useFormField - Hook para campos individuais
// ============================================

interface UseFormFieldOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  transform?: {
    input?: (value: unknown) => unknown;
    output?: (value: unknown) => unknown;
  };
}

export function useFormField<T extends FieldValues>({
  form,
  name,
  transform,
}: UseFormFieldOptions<T>) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const value = watch(name);
  const error = errors[name]?.message as string | undefined;

  const handleChange = useCallback(
    (newValue: unknown) => {
      const transformedValue = transform?.output
        ? transform.output(newValue)
        : newValue;
      setValue(name, transformedValue as T[Path<T>], { shouldValidate: true });
    },
    [name, setValue, transform]
  );

  const displayValue = transform?.input ? transform.input(value) : value;

  return {
    register: register(name),
    value: displayValue,
    error,
    onChange: handleChange,
    hasError: !!error,
  };
}

// ============================================
// Form State Utilities
// ============================================

export function isFormDirty<T extends FieldValues>(
  form: UseFormReturn<T>
): boolean {
  return form.formState.isDirty;
}

export function hasFormErrors<T extends FieldValues>(
  form: UseFormReturn<T>
): boolean {
  return Object.keys(form.formState.errors).length > 0;
}

export function getFormErrorCount<T extends FieldValues>(
  form: UseFormReturn<T>
): number {
  return Object.keys(form.formState.errors).length;
}

export function resetFormToDefaults<T extends FieldValues>(
  form: UseFormReturn<T>,
  defaults?: Partial<T>
): void {
  form.reset(defaults as T);
}
