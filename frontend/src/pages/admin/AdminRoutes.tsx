import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./layout/AdminLayout";
import AdminBlogList from "./blog/AdminBlogList";
import AdminBlogEdit from "./blog/AdminBlogEdit";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* ضع هنا بقية مسارات الأدمن لو وجدت (dashboard, products, ...). */}

        {/* Blog */}
        <Route path="blog" element={<AdminBlogList />} />
        <Route path="blog/new" element={<AdminBlogEdit mode="create" />} />
        <Route path="blog/:id" element={<AdminBlogEdit mode="edit" />} />
      </Route>

      {/* افتراضيًا انتقل لقائمة المدونة */}
      <Route path="*" element={<Navigate to="/admin/blog" replace />} />
    </Routes>
  );
}
