const CompanyQuestion = require("../models/CompanyQuestion");

// GET /api/questions?company=&topic=&search=&page=&limit=
const getQuestions = async (req, res) => {
    try {
        const { company, difficulty, list = "all", search, page = 1, limit = 30 } = req.query;
        const filter = { list };
        if (company) filter.company = company.toLowerCase();
        if (difficulty) filter.difficulty = difficulty;
        if (search) filter.title = { $regex: search, $options: "i" };

        const skip = (page - 1) * limit;
        const [questions, total] = await Promise.all([
            CompanyQuestion.find(filter).sort({ frequency: -1 }).skip(skip).limit(parseInt(limit)),
            CompanyQuestion.countDocuments(filter),
        ]);

        res.status(200).json({ questions, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/questions/company/:company
const getByCompany = async (req, res) => {
    req.query.company = req.params.company;
    return getQuestions(req, res);
};

// GET /api/questions/search?query=
const searchQuestions = async (req, res) => {
    req.query.search = req.query.query;
    return getQuestions(req, res);
};

// GET /api/questions/companies — distinct company list, for filter dropdown
const getCompanyList = async (req, res) => {
    try {
        const companies = await CompanyQuestion.distinct("company");
        res.status(200).json(companies.sort());
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getQuestions, getByCompany, searchQuestions, getCompanyList };