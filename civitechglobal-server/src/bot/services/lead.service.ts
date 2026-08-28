import { leadRepository, type CreateLeadInput } from '../../database/prisma/repositories/lead.repository.js';
import { sha256Hex } from '../../utils/hash.js';

export const leadService = {
  createLead: (data: CreateLeadInput) => {
    return leadRepository.createFromBot({
      ...data,
      phoneNumberHash: sha256Hex(data.phoneNumber),
    });
  },
};
