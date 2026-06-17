// Danh sách ngân hàng VietQR — fetch từ api.vietqr.io/v2/banks (2026-06-17, 65 NH)
// BIN là khoá lưu trong DB; shortName dùng hiển thị; logo từ CDN VietQR.

export interface BankInfo {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  logo?: string;
}

export const BANKS: BankInfo[] = [
  { bin: "970415", code: "ICB", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam", logo: "https://cdn.vietqr.io/img/ICB.png" },
  { bin: "970436", code: "VCB", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", logo: "https://cdn.vietqr.io/img/VCB.png" },
  { bin: "970418", code: "BIDV", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", logo: "https://cdn.vietqr.io/img/BIDV.png" },
  { bin: "970405", code: "VBA", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", logo: "https://cdn.vietqr.io/img/VBA.png" },
  { bin: "970448", code: "OCB", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông", logo: "https://cdn.vietqr.io/img/OCB.png" },
  { bin: "970422", code: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân đội", logo: "https://cdn.vietqr.io/img/MB.png" },
  { bin: "970407", code: "TCB", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam", logo: "https://cdn.vietqr.io/img/TCB.png" },
  { bin: "970416", code: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu", logo: "https://cdn.vietqr.io/img/ACB.png" },
  { bin: "970432", code: "VPB", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", logo: "https://cdn.vietqr.io/img/VPB.png" },
  { bin: "970423", code: "TPB", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", logo: "https://cdn.vietqr.io/img/TPB.png" },
  { bin: "970403", code: "STB", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", logo: "https://cdn.vietqr.io/img/STB.png" },
  { bin: "970437", code: "HDB", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/HDB.png" },
  { bin: "970454", code: "VCCB", shortName: "VietCapitalBank", name: "Ngân hàng TMCP Bản Việt", logo: "https://cdn.vietqr.io/img/VCCB.png" },
  { bin: "970429", code: "SCB", shortName: "SCB", name: "Ngân hàng TMCP Sài Gòn", logo: "https://cdn.vietqr.io/img/SCB.png" },
  { bin: "970441", code: "VIB", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", logo: "https://cdn.vietqr.io/img/VIB.png" },
  { bin: "970443", code: "SHB", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", logo: "https://cdn.vietqr.io/img/SHB.png" },
  { bin: "970431", code: "EIB", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", logo: "https://cdn.vietqr.io/img/EIB.png" },
  { bin: "970426", code: "MSB", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", logo: "https://cdn.vietqr.io/img/MSB.png" },
  { bin: "546034", code: "CAKE", shortName: "CAKE", name: "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank", logo: "https://cdn.vietqr.io/img/CAKE.png" },
  { bin: "546035", code: "Ubank", shortName: "Ubank", name: "TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank", logo: "https://cdn.vietqr.io/img/UBANK.png" },
  { bin: "971005", code: "VTLMONEY", shortName: "ViettelMoney", name: "Tổng Công ty Dịch vụ số Viettel - Chi nhánh tập đoàn công nghiệp viễn thông Quân Đội", logo: "https://cdn.vietqr.io/img/VIETTELMONEY.png" },
  { bin: "963388", code: "TIMO", shortName: "Timo", name: "Ngân hàng số Timo by Ban Viet Bank", logo: "https://vietqr.net/portal-service/resources/icons/TIMO.png" },
  { bin: "971011", code: "VNPTMONEY", shortName: "VNPTMoney", name: "VNPT Money", logo: "https://cdn.vietqr.io/img/VNPTMONEY.png" },
  { bin: "970400", code: "SGICB", shortName: "SaigonBank", name: "Ngân hàng TMCP Sài Gòn Công Thương", logo: "https://cdn.vietqr.io/img/SGICB.png" },
  { bin: "970409", code: "BAB", shortName: "BacABank", name: "Ngân hàng TMCP Bắc Á", logo: "https://cdn.vietqr.io/img/BAB.png" },
  { bin: "971025", code: "momo", shortName: "MoMo", name: "CTCP Dịch Vụ Di Động Trực Tuyến", logo: "https://cdn.vietqr.io/img/momo.png" },
  { bin: "971133", code: "PVDB", shortName: "PVcomBank Pay", name: "Ngân hàng TMCP Đại Chúng Việt Nam Ngân hàng số", logo: "https://cdn.vietqr.io/img/PVCB.png" },
  { bin: "970412", code: "PVCB", shortName: "PVcomBank", name: "Ngân hàng TMCP Đại Chúng Việt Nam", logo: "https://cdn.vietqr.io/img/PVCB.png" },
  { bin: "970414", code: "MBV", shortName: "MBV", name: "Ngân hàng TNHH MTV Việt Nam Hiện Đại", logo: "https://cdn.vietqr.io/img/MBV.png" },
  { bin: "970419", code: "NCB", shortName: "NCB", name: "Ngân hàng TMCP Quốc Dân", logo: "https://cdn.vietqr.io/img/NCB.png" },
  { bin: "970424", code: "SHBVN", shortName: "ShinhanBank", name: "Ngân hàng TNHH MTV Shinhan Việt Nam", logo: "https://cdn.vietqr.io/img/SHBVN.png" },
  { bin: "970425", code: "ABB", shortName: "ABBANK", name: "Ngân hàng TMCP An Bình", logo: "https://cdn.vietqr.io/img/ABB.png" },
  { bin: "970427", code: "VAB", shortName: "VietABank", name: "Ngân hàng TMCP Việt Á", logo: "https://cdn.vietqr.io/img/VAB.png" },
  { bin: "970428", code: "NAB", shortName: "NamABank", name: "Ngân hàng TMCP Nam Á", logo: "https://cdn.vietqr.io/img/NAB.png" },
  { bin: "970430", code: "PGB", shortName: "PGBank", name: "Ngân hàng TMCP Thịnh vượng và Phát triển", logo: "https://cdn.vietqr.io/img/PGB.png" },
  { bin: "970433", code: "VIETBANK", shortName: "VietBank", name: "Ngân hàng TMCP Việt Nam Thương Tín", logo: "https://cdn.vietqr.io/img/VIETBANK.png" },
  { bin: "970438", code: "BVB", shortName: "BaoVietBank", name: "Ngân hàng TMCP Bảo Việt", logo: "https://cdn.vietqr.io/img/BVB.png" },
  { bin: "970440", code: "SEAB", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", logo: "https://cdn.vietqr.io/img/SEAB.png" },
  { bin: "970446", code: "COOPBANK", shortName: "COOPBANK", name: "Ngân hàng Hợp tác xã Việt Nam", logo: "https://cdn.vietqr.io/img/COOPBANK.png" },
  { bin: "970449", code: "LPB", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", logo: "https://cdn.vietqr.io/img/LPB.png" },
  { bin: "970452", code: "KLB", shortName: "KienLongBank", name: "Ngân hàng TMCP Kiên Long", logo: "https://cdn.vietqr.io/img/KLB.png" },
  { bin: "668888", code: "KBank", shortName: "KBank", name: "Ngân hàng Đại chúng TNHH Kasikornbank", logo: "https://cdn.vietqr.io/img/KBANK.png" },
  { bin: "977777", code: "MAFC", shortName: "MAFC", name: "Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam)", logo: "https://cdn.vietqr.io/img/MAFC.png" },
  { bin: "970442", code: "HLBVN", shortName: "HongLeong", name: "Ngân hàng TNHH MTV Hong Leong Việt Nam", logo: "https://cdn.vietqr.io/img/HLBVN.png" },
  { bin: "970467", code: "KEBHANAHN", shortName: "KEBHANAHN", name: "Ngân hàng KEB Hana – Chi nhánh Hà Nội", logo: "https://cdn.vietqr.io/img/KEBHANAHN.png" },
  { bin: "970466", code: "KEBHANAHCM", shortName: "KEBHanaHCM", name: "Ngân hàng KEB Hana – Chi nhánh Thành phố Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/KEBHANAHCM.png" },
  { bin: "533948", code: "CITIBANK", shortName: "Citibank", name: "Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội", logo: "https://cdn.vietqr.io/img/CITIBANK.png" },
  { bin: "970444", code: "CBB", shortName: "CBBank", name: "Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam", logo: "https://cdn.vietqr.io/img/CBB.png" },
  { bin: "422589", code: "CIMB", shortName: "CIMB", name: "Ngân hàng TNHH MTV CIMB Việt Nam", logo: "https://cdn.vietqr.io/img/CIMB.png" },
  { bin: "796500", code: "DBS", shortName: "DBSBank", name: "DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/DBS.png" },
  { bin: "970406", code: "Vikki", shortName: "Vikki", name: "Ngân hàng TNHH MTV Số Vikki", logo: "https://cdn.vietqr.io/img/Vikki.png" },
  { bin: "999888", code: "VBSP", shortName: "VBSP", name: "Ngân hàng Chính sách Xã hội", logo: "https://cdn.vietqr.io/img/VBSP.png" },
  { bin: "970408", code: "GPB", shortName: "GPBank", name: "Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu", logo: "https://cdn.vietqr.io/img/GPB.png" },
  { bin: "970463", code: "KBHCM", shortName: "KookminHCM", name: "Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/KBHCM.png" },
  { bin: "970462", code: "KBHN", shortName: "KookminHN", name: "Ngân hàng Kookmin - Chi nhánh Hà Nội", logo: "https://cdn.vietqr.io/img/KBHN.png" },
  { bin: "970457", code: "WVN", shortName: "Woori", name: "Ngân hàng TNHH MTV Woori Việt Nam", logo: "https://cdn.vietqr.io/img/WVN.png" },
  { bin: "970421", code: "VRB", shortName: "VRB", name: "Ngân hàng Liên doanh Việt - Nga", logo: "https://cdn.vietqr.io/img/VRB.png" },
  { bin: "458761", code: "HSBC", shortName: "HSBC", name: "Ngân hàng TNHH MTV HSBC (Việt Nam)", logo: "https://cdn.vietqr.io/img/HSBC.png" },
  { bin: "970455", code: "IBK - HN", shortName: "IBKHN", name: "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội", logo: "https://cdn.vietqr.io/img/IBK.png" },
  { bin: "970456", code: "IBK - HCM", shortName: "IBKHCM", name: "Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/IBK.png" },
  { bin: "970434", code: "IVB", shortName: "IndovinaBank", name: "Ngân hàng TNHH Indovina", logo: "https://cdn.vietqr.io/img/IVB.png" },
  { bin: "970458", code: "UOB", shortName: "UnitedOverseas", name: "Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh", logo: "https://cdn.vietqr.io/img/UOB.png" },
  { bin: "801011", code: "NHB HN", shortName: "Nonghyup", name: "Ngân hàng Nonghyup - Chi nhánh Hà Nội", logo: "https://cdn.vietqr.io/img/NHB.png" },
  { bin: "970410", code: "SCVN", shortName: "StandardChartered", name: "Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam", logo: "https://cdn.vietqr.io/img/SCVN.png" },
  { bin: "970439", code: "PBVN", shortName: "PublicBank", name: "Ngân hàng TNHH MTV Public Việt Nam", logo: "https://cdn.vietqr.io/img/PBVN.png" },
];

export function findBankByBin(bin?: string | null): BankInfo | undefined {
  if (!bin) return undefined;
  return BANKS.find((b) => b.bin === bin);
}

// So khớp không dấu + lowercase + contains theo shortName/code/name
// Dùng để preselect bank cho CTV cũ chỉ có affiliate_bank_name dạng text
export function findBankByNameLoose(name?: string | null): BankInfo | undefined {
  if (!name) return undefined;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const q = normalize(name);
  return BANKS.find(
    (b) =>
      normalize(b.shortName).includes(q) ||
      normalize(b.code).includes(q) ||
      normalize(b.name).includes(q)
  );
}

// Trả "" nếu thiếu bin hoặc account để tránh render ảnh lỗi
export function buildVietQrUrl(
  bin?: string,
  account?: string,
  holder?: string
): string {
  if (!bin || !account) return "";
  return `https://img.vietqr.io/image/${bin}-${account}-compact2.png?accountName=${encodeURIComponent(
    (holder || "").trim()
  )}`;
}
