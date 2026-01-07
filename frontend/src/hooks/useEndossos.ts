import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Endosso } from "../types";

export function useEndossos(apoliceId: string) {
  return useQuery({
    queryKey: ["endossos", apoliceId],
    queryFn: () => api.get(`/endossos/apolice/${apoliceId}`),
    enabled: !!apoliceId,
  });
}

export function useCreateEndosso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Endosso>) => api.post("/endossos", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["endossos", variables.apolice_id] });
    },
  });
}

export function useUpdateEndossoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, apoliceId }: { id: string; status: string; apoliceId: string }) =>
      api.patch(`/endossos/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["endossos", variables.apoliceId] });
    },
  });
}
