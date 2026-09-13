# Sổ Bài Đôi

Web ghi điểm và tính tiền chơi bài dành cho hai người. React + TypeScript + Vite, lưu dữ liệu bằng localStorage, triển khai dạng web tĩnh trên Vercel.

## Chạy dự án

Yêu cầu Node.js **22.12 trở lên** (khuyên dùng Node 24 LTS) và pnpm 11.19.

```bash
npm install -g pnpm@11.19.0
pnpm install
pnpm dev
```

Mở địa chỉ được Vite in ra, mặc định `http://127.0.0.1:5173`.

```bash
pnpm test       # Kiểm tra tính tiền, dữ liệu và khôi phục
pnpm build      # Kiểm tra TypeScript và tạo thư mục dist/
pnpm preview    # Xem bản production tại localhost
```

## Cách sử dụng

1. Bấm **Cài đặt** để đổi tên hai người, tiền mỗi điểm và luật điểm cao/thấp thắng. Mặc định: Chồng, Vợ, 1.000 đồng/điểm, điểm cao thắng.
2. Nhập điểm của **từng ván** cho cả hai người, rồi bấm **Lưu điểm ván này** hoặc Enter. Chấp nhận điểm nguyên âm, dương và 0; nút −/+ hỗ trợ nhập trên điện thoại.
3. Bảng tổng hiển thị tổng điểm, số ván thắng, số tiền lãi/lỗ và ai cần trả cho ai.
4. Bấm biểu tượng bút để sửa hoặc thùng rác để xóa ván nhập nhầm. Xóa ván cần xác nhận.
5. **Buổi chơi mới** tạo bảng mới và giữ lại buổi cũ. **Lịch sử buổi chơi** cho phép mở lại một buổi để xem hoặc chơi tiếp.

### Công thức

Với A là người thứ nhất, B là người thứ hai:

```text
Điểm cao thắng: tiền A = (điểm A − điểm B) × tiền mỗi điểm
Điểm thấp thắng: tiền A = (điểm B − điểm A) × tiền mỗi điểm
Tiền B = −tiền A
```

Ví dụ A được 10 điểm, B được 4 điểm, 1.000 đồng/điểm, điểm cao thắng: A nhận 6.000 đồng từ B. Ván hòa không phát sinh tiền. Chốt tiền là tổng tiền của các ván trong buổi, chưa phải trạng thái đã thanh toán.

Mỗi ván lưu riêng mức tiền và luật. Đổi cài đặt chỉ áp dụng cho các ván ghi sau; sửa một ván vẫn dùng mức tiền và luật gốc. Mức tiền nguyên từ 1 đến 1.000.000 đồng, điểm mỗi người từ −100.000 đến 100.000. Mỗi buổi tối đa 10.000 ván; tối đa 200 buổi.

## Deploy Vercel

Đã có `vercel.json` và lockfile, không cần database, API key hay biến môi trường.

**Qua Git:** đưa toàn bộ mã nguồn (kèm `pnpm-lock.yaml`, `pnpm-workspace.yaml`) lên repository của bạn → Vercel → Add New Project → Import repository → Deploy. Thư mục gốc là thư mục chứa `package.json`. Cấu hình đã đặt Vite, lệnh build `pnpm build` và output `dist`.

**Qua CLI:** chạy trong thư mục dự án và làm theo bước đăng nhập/chọn tài khoản của Vercel:

```bash
npx vercel@latest --prod
```

Tham khảo [tài liệu Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Dữ liệu

- Key localStorage: `so-bai-doi:v1`, schema version 1. Tất cả tiền được tính từ các ván, không lưu tổng trùng lặp.
- Dữ liệu chỉ thuộc trình duyệt và địa chỉ web hiện tại. **Hai điện thoại không tự đồng bộ**, dù cùng mở một URL; dùng một máy để ghi chung.
- Localhost, URL preview và tên miền production có vùng lưu trữ riêng. Đổi tên miền hoặc xóa dữ liệu trình duyệt sẽ không mang theo lịch sử. Chế độ ẩn danh có thể xóa dữ liệu khi đóng phiên.
- Không cần backend hoặc đăng nhập. Tải lại trang vẫn giữ lịch sử sau khi lưu thành công.
- Kiểm tra dữ liệu khi đọc; nếu dữ liệu cũ lỗi thì hiển thị cảnh báo và không ghi đè. Nếu bộ nhớ đầy/bị chặn, thao tác chưa lưu sẽ báo lỗi và giữ nội dung nhập để thử lại.
- Các tab cùng trình duyệt nhận cập nhật qua sự kiện `storage`. Không phải cơ chế cộng tác thời gian thực; tránh ghi đồng thời từ nhiều tab.

## Mã nguồn chính

```text
src/App.tsx        Giao diện, nhập/sửa/xóa ván, cài đặt, lịch sử buổi chơi
src/game.ts        Kiểu dữ liệu, tính điểm/tiền, xác thực dữ liệu lưu
src/useGame.ts     Đọc/ghi localStorage và nhận thay đổi từ tab khác
src/useScoreTool.ts Công cụ đọc bảng điểm cho trình duyệt hỗ trợ WebMCP
src/game.test.ts   Kiểm tra logic tính tiền và dữ liệu
src/styles.css    Giao diện responsive
vercel.json       Cấu hình triển khai
```

Giao diện và font tiếng Việt được đóng gói cùng ứng dụng. Mã không gửi điểm hoặc tiền lên máy chủ.

WebMCP là phần tăng cường tùy chọn, chỉ bật nếu trình duyệt hỗ trợ. Công cụ `get_current_score` chỉ đọc bảng điểm hiện tại, không sửa dữ liệu. Đã kiểm tra đăng ký, dữ liệu trả về và đầu vào sai bằng API giả lập; môi trường kiểm tra chưa có WebMCP native. Trình duyệt thông thường sử dụng đầy đủ giao diện mà không cần tính năng này.
