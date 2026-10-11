// Finds (or creates) the chat between a customer and a provider.
export async function openConversation(supabase: any, customerId: string, providerId: string, bookingId?: string | null): Promise<string> {
  const { data: ex } = await supabase
    .from('conversations').select('id')
    .eq('customer_id', customerId).eq('provider_id', providerId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (ex?.id) return ex.id as string;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ customer_id: customerId, provider_id: providerId, booking_id: bookingId ?? null })
    .select('id').single();
  if (error) throw error;
  return data.id as string;
}
