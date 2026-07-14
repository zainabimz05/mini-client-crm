export const validateClient = (req, res, next) => {
  const { full_name, company, email, lead_status, phone } = req.body;
  const errors = {};

  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
    errors.full_name = 'Full name is required and must be a string';
  }
  
  if (!company || typeof company !== 'string' || company.trim() === '') {
    errors.company = 'Company is required and must be a string';
  }

  if (!email || typeof email !== 'string' || email.trim() === '') {
    errors.email = 'Email is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Invalid email format';
    }
  }

  if (!lead_status || typeof lead_status !== 'string' || lead_status.trim() === '') {
    errors.lead_status = 'Lead status is required';
  }

  if (phone && typeof phone !== 'string') {
    errors.phone = 'Phone must be a string';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

export const validateFollowup = (req, res, next) => {
  const { client_id, followup_date, followup_time, purpose, status } = req.body;
  const errors = {};

  if (client_id === undefined || client_id === null) {
    errors.client_id = 'Client ID is required';
  } else if (isNaN(Number(client_id))) {
    errors.client_id = 'Client ID must be a valid number';
  }

  if (!followup_date || typeof followup_date !== 'string' || followup_date.trim() === '') {
    errors.followup_date = 'Follow-up date is required';
  } else {
    // Standard YYYY-MM-DD validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(followup_date)) {
      errors.followup_date = 'Follow-up date must be in YYYY-MM-DD format';
    }
  }

  if (followup_time) {
    // HH:MM 24h format validation
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(followup_time)) {
      errors.followup_time = 'Follow-up time must be in HH:MM format (24-hour)';
    }
  }

  if (!purpose || typeof purpose !== 'string' || purpose.trim() === '') {
    errors.purpose = 'Purpose is required';
  }

  if (!status || typeof status !== 'string' || status.trim() === '') {
    errors.status = 'Status is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};
