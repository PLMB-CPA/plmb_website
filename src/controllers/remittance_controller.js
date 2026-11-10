const Remittance = require('../models/Remittance');

// TODO: confirm which fields are mandatory
// TODO: confirm enum values

const addRemittanceRecord = async (req, res) => {
    try {
        const { client, taxType, amount, dueDate } = req.body;

        if (!client || !taxType || amount === undefined) {
            return res.status(400).json({ message: 'Client, tax type, and amount are required' });
        }

        const validTaxTypes = ['VAT', 'Percentage Tax', 'Income Tax', 'Withholding Tax'];
        if (!validTaxTypes.includes(taxType)) {
            return res.status(400).json({ message: 'Invalid tax type selected' });
        }

        if (isNaN(amount) || amount < 0) {
            return res.status(400).json({ message: 'Amount must be a valid positive number' });
        }

        const remittance = await Remittance.create({
            client,
            taxType,
            amount,
            dueDate: dueDate || null
        });

        res.status(201).json({ message: 'Remittance record created', remittance });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// get remittance records for authenticated admin page
const getAdminRemittances = async (req, res) => {
    try {
        // Fetches all remittances, sorts by due date
        const remittances = await Remittance.find()
            .sort({ dueDate: 1 })
            .populate('client', 'firstName lastName email')
            .populate('lastEditedBy', 'username');

        res.status(200).json(remittances);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch remittances' });
    }
};

const updateRemittanceStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const validStatuses = ['Pending', 'Processing', 'Remitted', 'Completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status update' });
        }

        const adminId = req.session && req.session.adminId ? req.session.adminId : null;

        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized: Admin session missing' });
        }

        const remittance = await Remittance.findByIdAndUpdate(
            req.params.id,
            {
                status,
                lastEditedBy: adminId
            },
            { new: true, runValidators: true }
        )
            .populate('client', 'firstName lastName email')
            .populate('lastEditedBy', 'firstName lastName');

        if (!remittance) {
            return res.status(404).json({ message: 'Remittance record not found' });
        }

        res.status(200).json({ message: 'Remittance status updated', remittance });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// get remittance records for a particular client (authenticated client-side page)
const getClientRemittances = async (req, res) => {
    try {
        // Ensures clients can only read their own records
        const clientId = req.session && req.session.clientId ? req.session.clientId : null;

        if (!clientId) {
            return res.status(401).json({ message: 'Unauthorized: Session missing' });
        }

        // Fetch only remittances belonging to this specific client
        const remittances = await Remittance.find({ client: clientId })
            .select('taxType amount dueDate status')
            .sort({ dueDate: 1 }); // sort from earliest to farthest

        res.status(200).json(remittances);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch remittances' });
    }
};

/*
const deleteRemittance = async (req, res) => {
  try {
    const remittance = await Remittance.findByIdAndDelete(req.params.id);
    if (!remittance) {
      return res.status(404).json({ message: 'Remittance record not found' });
    }
    res.status(200).json({ message: 'Remittance record deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
*/

module.exports = {
    addRemittanceRecord,
    getAdminRemittances,
    updateRemittanceStatus,
    // deleteRemittance
    getClientRemittances,
};