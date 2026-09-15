import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";

@Table
class CrmConfig extends Model<CrmConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default(15)
  @Column
  diasClienteSumido: number;

  @Default("09:00")
  @Column
  horarioEnvio: string;

  @Column(DataType.TEXT)
  mensagemAniversario: string;

  @Column(DataType.TEXT)
  mensagemSumido: string;

  @Default(true)
  @Column
  autoEnvioAtivo: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CrmConfig;
