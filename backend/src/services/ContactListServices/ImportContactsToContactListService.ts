import fs from "fs";
import * as xlsx from "xlsx";
import AppError from "../../errors/AppError";
import ContactListItem from "../../models/ContactListItem";
import ContactList from "../../models/ContactList";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

interface Request {
  contactListId: number | string;
  companyId: number;
  file: Express.Multer.File;
}

const ImportContactsToContactListService = async ({
  contactListId,
  companyId,
  file
}: Request): Promise<ContactListItem[]> => {
  const contactList = await ContactList.findOne({
    where: { id: contactListId, companyId }
  });

  if (!contactList) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  if (!file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const workbook = xlsx.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(worksheet);

  const importedItems: ContactListItem[] = [];

  for (const row of rows) {
    // Normalização das chaves comuns
    const name = row.nome || row.Nome || row.name || row.Name || "";
    let number = String(
      row.numero || row.Numero || row.number || row.Number || row.telefone || row.Telefone || row.phone || row.Phone || ""
    ).replace(/[^0-9]/g, "");
    const email = row.email || row.Email || row.e_mail || "";

    if (!number || number.length < 8) {
      continue;
    }

    // Se número brasileiro sem código do país (DDI 55)
    if (number.length === 10 || number.length === 11) {
      number = `55${number}`;
    }

    // Verificar se o contato tem flag opt-out no cadastro de contatos do tenant
    const contact = await Contact.findOne({
      where: { number, companyId }
    });

    const optOut = contact ? contact.optOut : false;

    const [item, created] = await ContactListItem.findOrCreate({
      where: {
        number,
        contactListId: Number(contactListId),
        companyId
      },
      defaults: {
        name: name || number,
        number,
        email,
        contactListId: Number(contactListId),
        companyId,
        isWhatsappValid: true,
        optOut
      }
    });

    if (!created) {
      await item.update({
        name: name || item.name,
        email: email || item.email,
        optOut: optOut || item.optOut
      });
    }

    importedItems.push(item);
  }

  // Deletar arquivo temporário da planilha
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (err: any) {
    logger.warn(`[ImportContacts] Failed to remove temp upload file: ${err.message}`);
  }

  return importedItems;
};

export default ImportContactsToContactListService;
