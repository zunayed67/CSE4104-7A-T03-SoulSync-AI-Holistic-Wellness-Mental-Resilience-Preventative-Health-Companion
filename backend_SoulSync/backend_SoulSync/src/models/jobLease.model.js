import mongoose from 'mongoose';

const jobLeaseSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    leaseUntil: { type: Date, required: true },
  },
  { versionKey: false, collection: 'job_leases' },
);

export const JobLease = mongoose.model('JobLease', jobLeaseSchema);
