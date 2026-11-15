export abstract class INikEmployeePort {
  abstract findEmployeeIdByNik(nik: string): Promise<string | null>
}
