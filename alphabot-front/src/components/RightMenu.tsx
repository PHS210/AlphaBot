// Mock data for categories
const categories = [
  { id: 1, icon: '📊', label: '카테고리' },
  { id: 2, icon: '⚪', label: '새로운 카테고리' },
  { id: 3, icon: '📰', label: '분석' },
]

export default function RightMenu() {
  return (
    <aside className="sidebar right">
      {categories.map((category) => (
        <div key={category.id} className="menu-btn">
          <span>{category.icon}</span> {category.label}
        </div>
      ))}
    </aside>
  )
}

