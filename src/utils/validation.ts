export const validateStatus = (status: string | null) => {
  if (!status) return false;
  const validStatuses = ['online', 'lunch', 'meeting', 'busy', 'offline'];
  return validStatuses.includes(status);
};

export const validateLocation = (lat: number, lng: number) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}; 