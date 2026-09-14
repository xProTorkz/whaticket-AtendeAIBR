import Company from "../../models/Company";

const ListCompaniesService = async (): Promise<Company[]> => {
  const companies = await Company.findAll({
    order: [["name", "ASC"]],
    include: ["users", "whatsapps"]
  });

  return companies;
};

export default ListCompaniesService;
